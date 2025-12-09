import express from 'express';
import  { supabase } from '../supabaseClient.js';
import { supabase as productSupabase } from '../supabaseProduct.js';
import authenticate from '../util/middlerware.js';
import { getAdminContext, getAdminCategories } from '../util/adminContext.js';
import { logAuditEvent, AuditActions } from '../util/auditLogger.js';
import multer from 'multer';
import { emailService } from '../util/emailService.js';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Create notification Supabase client (same as Settings)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '..', '.env') });

const notificationSupabaseUrl = process.env.SUPABASE_URL;
const notificationSupabaseKey = process.env.SUPABASE_SERVICE_KEY;

const notificationSupabase = createClient(notificationSupabaseUrl, notificationSupabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

console.log('✅ Product routes module loaded - Notification system ready');

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });

const buildStockStatusEntry = (product, stock = {}) => {
  const currentQty = Number(stock.current_quantity ?? 0);
  const displayQty = Number(stock.display_quantity ?? 0);
  const reservedQty = Number(stock.reserved_quantity ?? 0);
  const effectiveDisplay = displayQty + reservedQty;
  const inventoryUpdatedAt = stock.inventory_updated_at || null;
  const displaySyncedAt = stock.display_synced_at || null;
  const inventoryTime = inventoryUpdatedAt ? new Date(inventoryUpdatedAt).getTime() : null;
  const displaySyncTime = displaySyncedAt ? new Date(displaySyncedAt).getTime() : null;
  const hasInventoryUpdate = typeof inventoryTime === 'number' && (!displaySyncTime || inventoryTime > displaySyncTime);
  const displayLagging = currentQty > effectiveDisplay;
  const needsSync = Boolean(hasInventoryUpdate || (!inventoryTime && displayLagging));

  return {
    product_id: product.product_id,
    product_name: product.product_name,
    current_quantity: currentQty,
    display_quantity: displayQty,
    reserved_quantity: reservedQty,
    effective_display: effectiveDisplay,
    last_sync_at: stock.last_sync_at,
    inventory_updated_at: inventoryUpdatedAt,
    display_synced_at: displaySyncedAt,
    needs_sync: needsSync,
    difference: needsSync ? Math.max(currentQty - effectiveDisplay, 0) : 0,
    has_stock_entry: !!(stock.product_id || stock.current_quantity !== undefined || stock.display_quantity !== undefined)
  };
};
// Helper function: Update or create product stock quantities in database
const updateProductStock = async (productId, inventoryQuantity, inventoryUpdatedAt) => {
  try {
    const timestamp = new Date().toISOString();
    const inventoryTimestamp = inventoryUpdatedAt || timestamp;

    const { data: existingStock, error: fetchError } = await supabase
      .from('product_stock')
      .select('id, current_quantity, display_quantity')
      .eq('product_id', productId)
      .maybeSingle();

    if (fetchError) {
      console.error(`Fetch error for product ${productId}:`, fetchError);
      return { success: false, error: fetchError.message };
    }

    if (existingStock) {
      const { error: updateError } = await supabase
        .from('product_stock')
        .update({
          current_quantity: inventoryQuantity,
          inventory_updated_at: inventoryTimestamp,
          // Leave display_quantity untouched so modal can confirm update
          updated_at: timestamp
        })
        .eq('product_id', productId);

      if (updateError) {
        console.error(`Update error for product ${productId}:`, updateError);
        return { success: false, error: updateError.message };
      }
      
      return { success: true, action: 'updated' };
    } else {
      const { error: insertError } = await supabase
        .from('product_stock')
        .insert([{
          product_id: productId,
          current_quantity: inventoryQuantity,
          // Initialize display_quantity to 0 so admins can review and approve updates
          display_quantity: 0,
          reserved_quantity: 0,
          last_sync_at: timestamp,
          updated_at: timestamp,
          inventory_updated_at: inventoryTimestamp,
          display_synced_at: null
        }]);

      if (insertError) {
        console.error(`Insert error for product ${productId}:`, insertError);
        return { success: false, error: insertError.message };
      }
      
      return { success: true, action: 'created' };
    }
  } catch (err) {
    console.error(`Unhandled error for product ${productId}:`, err);
    return { success: false, error: err.message };
  }
};

// GET /api/products - Sync products from inventory database to client database
router.get('/products', authenticate, async (req, res) => {
  try {
    const { after, limit = 1000, sync } = req.query;
    const isForceSync = false;

    if (!sync || sync === 'false') {
      return res.redirect('/products/existing');
    }

    // Get admin context to check SuperAdmin status and categories
    const adminContext = await getAdminContext(req.user.id);
    let invQuery = productSupabase
      .from('centralized_product')
      .select(`
        id,
        product_name,
        quantity,
        price,
        status,
      updated_at,
        category:category ( category_name ),
        branch:branch ( location )
      `)
      .order('updated_at', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(parseInt(limit, 10));

    if (after) {
      invQuery = invQuery.or(`created_at.gt.${after},updated_at.gt.${after}`);
    }

    const { data: invRows, error: fetchErr } = await invQuery;
    
    if (fetchErr) {
      return res.status(500).json({
        error: 'Failed to fetch products',
        details: fetchErr.message
      });
    }

    if (!invRows?.length) {
      return res.json({
        success: true,
        products: [],
        synced: 0,
        skipped: 0,
        timestamp: new Date().toISOString()
      });
    }
    

    // Filter by categories if not SuperAdmin
    let filteredRows = invRows;
    if (!adminContext.isSuperAdmin) {
      if (!adminContext.assignedCategories || adminContext.assignedCategories.length === 0) {
        // No categories assigned - return empty result
        return res.json({
          success: true,
          products: [],
          synced: 0,
          skipped: invRows.length,
          timestamp: new Date().toISOString()
        });
      }
      // Filter rows to only include assigned categories
      filteredRows = invRows.filter((r) => {
        const categoryName = r.category?.category_name?.trim();
        return categoryName && adminContext.assignedCategories.includes(categoryName);
      });
    }

    // Check which products already exist to preserve their is_published and publish_status values
    const productIds = filteredRows.map(r => r.id);
    let existingProducts = [];
    let existingError = null;
    
    console.log(`🔍 [Sync] Checking for ${productIds.length} existing products...`);
    
    if (productIds.length > 0) {
      // Normalize productIds to strings for the query
      const productIdStrings = productIds.map(id => String(id).trim());
      console.log(`🔍 [Sync] Querying for product_ids: ${productIdStrings.slice(0, 5).join(', ')}${productIdStrings.length > 5 ? '...' : ''}`);
      
      const existingResult = await supabase
        .from('products')
        .select('product_id, is_published, publish_status, on_sale')
        .in('product_id', productIdStrings);
      
      existingProducts = existingResult.data || [];
      existingError = existingResult.error;
      
      if (existingError) {
        console.error('❌ [Sync] Error fetching existing products:', existingError);
      } else {
        console.log(`✅ [Sync] Found ${existingProducts.length} existing products in database`);
        if (existingProducts.length > 0) {
          // Log sample of found products
          const sample = existingProducts.slice(0, 3);
          sample.forEach(p => {
            console.log(`   - Product ${p.product_id}: is_published=${p.is_published}, publish_status=${p.publish_status}`);
          });
        }
      }
    }
    
    // Create a map of existing products for quick lookup
    // Normalize product_id to string for consistent Map key matching
    const existingProductsMap = new Map();
    if (existingProducts && existingProducts.length > 0) {
      existingProducts.forEach(p => {
        // Normalize to string to match with r.id (which is int4 from centralized_product)
        const key = String(p.product_id).trim();
        existingProductsMap.set(key, {
          is_published: p.is_published ?? false,
          publish_status: p.publish_status ?? false,
          on_sale: p.on_sale ?? false // Also preserve on_sale status
        });
      });
      console.log(`📋 [Sync] Created map with ${existingProductsMap.size} products to preserve status for`);
    } else {
      console.warn(`⚠️ [Sync] No existing products found - all will be set to is_published=false, publish_status=false`);
    }

    // Insertion of Inventory DB to Client DB
    // For existing products, preserve their is_published, publish_status, and on_sale values
    // For new products, set is_published and publish_status to false, on_sale to false
    let preservedCount = 0;
    let newCount = 0;
    
    const rowsForClient = filteredRows.map((r) => {
      // Normalize r.id to string to match Map key (product_id is text in DB)
      const lookupKey = String(r.id).trim();
      const existing = existingProductsMap.get(lookupKey);
      
      if (existing) {
        preservedCount++;
        if (preservedCount <= 5) { // Log first 5 to avoid spam
          console.log(`✅ [Sync] Preserving status for product ${lookupKey}: is_published=${existing.is_published}, publish_status=${existing.publish_status}`);
        }
      } else {
        newCount++;
        if (newCount <= 5) { // Log first 5 to avoid spam
          console.log(`🆕 [Sync] New product ${lookupKey}: setting is_published=false, publish_status=false`);
        }
      }
      
      return {
        product_id: String(r.id).trim(), // Ensure product_id is always a string
        product_name: r.product_name,
        price: r.price,
        status: r.status ?? 'active',
        category: r.category?.category_name?.trim() || null,
        branch: r.branch?.location?.trim() || null,
        // Preserve existing values, or set to false for new products
        is_published: existing ? (existing.is_published ?? false) : false,
        publish_status: existing ? (existing.publish_status ?? false) : false,
        on_sale: existing ? (existing.on_sale ?? false) : false, // Preserve on_sale for existing products
        pickup_available: true, // Default to available for pickup
      };
    });
    
    console.log(`📊 [Sync] Summary: ${preservedCount} existing products (status preserved), ${newCount} new products (status=false)`);

    // Try to insert with service role, if RLS still blocks, use direct SQL
    let upserted, upsertErr;
    
    try {
      // Use upsert but ensure we're updating the right fields
      // Supabase upsert will update all provided fields on conflict, which is what we want
      const result = await supabase
        .from('products')
        .upsert(rowsForClient, {
          onConflict: 'product_id',
          ignoreDuplicates: false
        })
        .select('id, product_id, is_published, publish_status, on_sale');
      
      upserted = result.data;
      upsertErr = result.error;
      
      if (upsertErr) {
        console.error('Upsert error:', upsertErr);
      } else if (upserted) {
        // Verify that status was preserved
        const statusPreserved = upserted.filter(p => {
          const original = existingProductsMap.get(String(p.product_id).trim());
          return !original || (p.is_published === original.is_published && p.publish_status === original.publish_status);
        });
        console.log(`✅ [Sync] Upserted ${upserted.length} products, ${statusPreserved.length} had status preserved`);
      }
    } catch (error) {
      upsertErr = error;
      console.error('Upsert exception:', error);
    }

    // If RLS still blocks, try individual inserts
    if (upsertErr && upsertErr.code === '42501') {
      
      try {
        // Try individual inserts as fallback
        const insertResults = [];
        for (const row of rowsForClient) {
          const { data, error } = await supabase
            .from('products')
            .insert(row)
            .select();
          insertResults.push({ data, error });
        }
        upserted = insertResults.filter(r => r.data).map(r => r.data).flat();
        upsertErr = insertResults.some(r => r.error) ? insertResults.find(r => r.error).error : null;
        
      } catch (individualError) {
        upsertErr = individualError;
      }
    }

    if (upsertErr) {
      return res.status(500).json({
        error: 'Failed to insert products into client database',
        details: upsertErr.message,
        code: upsertErr.code
      });
    }

    const syncedCount = upserted ? upserted.length : rowsForClient.length;
    const skippedCount = invRows.length - filteredRows.length;
    const timestamp = new Date().toISOString();
    
    const stockResults = [];

    for (const product of invRows) {
      const result = await updateProductStock(
        product.id,
        product.quantity || 0,
        product.updated_at
      );
      stockResults.push({
        product_id: product.id,
        ...result,
        quantity: product.quantity || 0
      });
    }
    
        const stockSuccessCount = stockResults.filter(r => r.success).length;
        const stockFailCount = stockResults.filter(r => !r.success).length;

        res.json({
          success: true,
          products: upserted,
          synced: syncedCount,
          skipped: Math.max(0, invRows.length - syncedCount),
          stock: {
            processed: stockResults.length,
            success: stockSuccessCount,
            failed: stockFailCount,
            results: stockResults
          },
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        res.status(500).json({
          success: false,
          error: 'Failed to sync products',
          details: error.message
        });
      }
  });

// GET /api/client-products - Get published products for client app with pagination and filters
// Supports optional authentication for role-based filtering
router.get('/client-products', async (req, res) => {
  try {
    const { page = 1, limit = 1000, status, category, search } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Check if user is authenticated (for role-based filtering)
    // Try to authenticate if Authorization header is present
    let adminContext = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        
        if (!authError && user) {
          // User is authenticated, get admin context for role-based filtering
          adminContext = await getAdminContext(user.id);
        }
      } catch (err) {
        // If authentication fails, proceed without role-based filtering (for client app)
        console.warn('Optional auth failed, proceeding without role-based filter:', err.message);
      }
    }

    let query = supabase
      .from('products')
      .select(`
        id,
        product_id,
        product_name,       
        price,
        status,
        category,
        branch,
        inserted_at,
        description,
        publish_status,
        is_published,
        pickup_available,
        product_stock (
          display_quantity,
          reserved_quantity,
          last_sync_at
        )
      `)
      .order('inserted_at', { ascending: false });

    // Apply role-based filtering if user is authenticated and not SuperAdmin
    if (adminContext && !adminContext.isSuperAdmin) {
      if (!adminContext.assignedCategories || adminContext.assignedCategories.length === 0) {
        // No categories assigned - return empty result
        return res.json({
          success: true,
          products: [],
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: 0,
            totalPages: 0
          },
          timestamp: new Date().toISOString()
        });
      }
      // Filter by assigned categories
      query = query.in('category', adminContext.assignedCategories);
    }

    // Filter by publish_status when status is 'active' (for Stock page)
    if (status === 'active') {
      query = query.eq('publish_status', true);
    } else if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    if (search && search.trim()) {
      query = query.ilike('product_name', `%${search.trim()}%`);
    }

    query = query.range(offset, offset + parseInt(limit) - 1);

    const { data: products, error: fetchError } = await query;

    if (fetchError) {
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch products from client database',
        details: fetchError.message
      });
    }

    const transformedProducts = products.map(product => {
      const stock = (product.product_stock && Array.isArray(product.product_stock))
        ? (product.product_stock[0] || {})
        : {};
      return {
        ...product,
        display_quantity: stock.display_quantity ?? 0,
        reserved_quantity: stock.reserved_quantity ?? 0,
        last_sync_at: stock.last_sync_at,
        product_stock: undefined
      };
    });

    // Apply same filters to count query
    let countQuery = supabase
      .from('products')
      .select('*', { count: 'exact', head: true });

    // Apply role-based filtering to count query if user is authenticated and not SuperAdmin
    if (adminContext && !adminContext.isSuperAdmin) {
      if (adminContext.assignedCategories && adminContext.assignedCategories.length > 0) {
        countQuery = countQuery.in('category', adminContext.assignedCategories);
      } else {
        // No categories assigned - count is 0
        countQuery = countQuery.eq('id', -1); // Impossible condition to return 0
      }
    }

    if (status === 'active') {
      countQuery = countQuery.eq('publish_status', true);
    } else if (status && status !== 'all') {
      countQuery = countQuery.eq('status', status);
    }

    if (category && category !== 'all') {
      countQuery = countQuery.eq('category', category);
    }

    if (search && search.trim()) {
      countQuery = countQuery.ilike('product_name', `%${search.trim()}%`);
    }

    const { count: totalCount, error: countError } = await countQuery;

    if (countError) {
      console.error('Error getting count:', countError);
    }

    res.json({
      success: true,
      products: transformedProducts || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / parseInt(limit))
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

// POST /api/products/:productId/media - Upload media files for a specific product
router.post('/products/:productId/media', authenticate, upload.array('media', 10), async (req, res) => {
  try {
    const { productId } = req.params;
    const files = req.files;
    
      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
      }

    // First, fetch existing media URLs to append new ones
    const { data: existingProduct, error: fetchError } = await supabase
      .from('products')
      .select('media_urls')
      .eq('id', productId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "not found", which is okay for new products
      return res.status(500).json({ error: 'Failed to fetch existing media', details: fetchError.message });
    }

    // Get existing media URLs, handle both array and string formats
    let existingMediaUrls = [];
    if (existingProduct && existingProduct.media_urls) {
      if (Array.isArray(existingProduct.media_urls)) {
        existingMediaUrls = existingProduct.media_urls;
      } else if (typeof existingProduct.media_urls === 'string') {
        try {
          existingMediaUrls = JSON.parse(existingProduct.media_urls);
          if (!Array.isArray(existingMediaUrls)) {
            existingMediaUrls = [existingProduct.media_urls];
          }
        } catch {
          existingMediaUrls = [existingProduct.media_urls];
        }
      }
    }

    const newMediaUrls = [];

    for (const file of files) {
      const filePath = `products/${productId}/${Date.now()}_${file.originalname}`;
      const { data, error } = await supabase.storage
        .from('product-image')
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          upsert: true
        });

    if (error) {
      return res.status(500).json({ error: 'Failed to upload media file', details: error.message });
    }

    const { data: usrlData } = supabase.storage
      .from('product-image')
      .getPublicUrl(data.path);

    newMediaUrls.push(usrlData.publicUrl);
    }
    
    // Combine existing and new media URLs
    const updatedMediaUrls = [...existingMediaUrls, ...newMediaUrls];
    
    const { error: dbError } = await supabase
      .from('products')
      .update({ media_urls: updatedMediaUrls })
      .eq('id', productId);
      
      if (dbError) {
      return res.status(500).json({ error: 'Failed to update product media URLs', details: dbError.message });
      }

        res.json({ success: true, mediaUrls: updatedMediaUrls, newUrls: newMediaUrls });
      } catch (err) {

      res.status(500).json({
        error: 'Internal server error',
        message: err.message,
      });
    }
});

// GET /api/products/:productId/media - Get media files for a specific product
router.get('/products/:productId/media', async (req, res) => {
  const { productId } = req.params;

  try {
    const { data: product, error } = await supabase
      .from('products')
      .select('media_urls')
      .eq('id', productId)
      .single();

    if (error) {
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch product media',
        details: error.message
      });
    }

    if (!product || !product.media_urls) {
      return res.status(404).json({
        success: false,
        error: 'Product not found or no media available'
      });
    }

    const parsedMediaUrls = Array.isArray(product.media_urls)
    ? product.media_urls.map((entry) =>
        typeof entry === 'string' && entry.startsWith('[')
          ? JSON.parse(entry) // if stringified array, parse it
          : entry
      ).flat()
    : JSON.parse(product.media_urls);


    res.json({
      success: true,
      mediaUrls: parsedMediaUrls,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

// GET /api/client-products/categories - Get unique product categories for filters
router.get('/client-products/categories', async (req, res) => {
  try {
    // Check if user is authenticated (for role-based filtering)
    let adminContext = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        
        if (!authError && user) {
          // User is authenticated, get admin context for role-based filtering
          adminContext = await getAdminContext(user.id);
        }
      } catch (err) {
        // If authentication fails, proceed without role-based filtering (for client app)
        console.warn('Optional auth failed, proceeding without role-based filter:', err.message);
      }
    }

    let query = supabase
      .from('products')
      .select('category')
      .eq('publish_status', true)
      .not('category', 'is', null);

    // Apply role-based filtering if user is authenticated and not SuperAdmin
    if (adminContext && !adminContext.isSuperAdmin) {
      if (!adminContext.assignedCategories || adminContext.assignedCategories.length === 0) {
        // No categories assigned - return empty array
        return res.json({
          success: true,
          categories: [],
          timestamp: new Date().toISOString()
        });
      }
      // Filter by assigned categories
      query = query.in('category', adminContext.assignedCategories);
    }

    query = query.order('category');

    const { data: categories, error } = await query;

    if (error) {
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch categories',
        details: error.message
      });
    }

    // Get unique categories
    const uniqueCategories = [...new Set(categories.map(item => item.category))];

    res.json({
      success: true,
      categories: uniqueCategories,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

// GET /api/admin/categories - Get all unique categories (for admin assignment)
router.get('/admin/categories', authenticate, async (req, res) => {
  try {
    const { data: categories, error } = await supabase
      .from('products')
      .select('category')
      .not('category', 'is', null);

    if (error) {
        return res.status(500).json({
        success: false,
        error: 'Failed to fetch categories'
      });
    }

    const uniqueCategories = Array.from(new Set(categories.map(c => c.category).filter(Boolean))).sort();

    res.json({
      success: true,
      categories: uniqueCategories
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/admin/branches - Get all unique branches (for admin assignment)
router.get('/admin/branches', authenticate, async (req, res) => {
  try {
    // Get branches from products table
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('branch')
      .not('branch', 'is', null);

    // Also get branches from orders table
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('branch')
      .not('branch', 'is', null);

    if (productsError || ordersError) {
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch branches'
      });
    }

    const branchesFromProducts = (products || []).map(p => p.branch).filter(Boolean);
    const branchesFromOrders = (orders || []).map(o => o.branch).filter(Boolean);
    
    const uniqueBranches = Array.from(new Set([...branchesFromProducts, ...branchesFromOrders])).sort();

    res.json({
      success: true,
      branches: uniqueBranches
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/client-products - Get all products that are active
router.get('/active-client-products', async (req, res) => {
  const { status, category } = req.query;
  const rawStatus = status || '';
  const normalizedStatus = rawStatus.toString().trim().toLowerCase();
    
  try {
    // Check if user is authenticated (for role-based filtering)
    let adminContext = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        
        if (!authError && user) {
          // User is authenticated, get admin context for role-based filtering
          adminContext = await getAdminContext(user.id);
        }
      } catch (err) {
        // If authentication fails, proceed without role-based filtering (for client app)
        console.warn('Optional auth failed, proceeding without role-based filter:', err.message);
      }
    }

    let query = supabase.from('products').select('*');

    // Apply role-based filtering if user is authenticated and not SuperAdmin
    if (adminContext && !adminContext.isSuperAdmin) {
      if (!adminContext.assignedCategories || adminContext.assignedCategories.length === 0) {
        // No categories assigned - return empty array
        return res.json({
          success: true,
          products: [],
          timestamp: new Date().toISOString()
        });
      }
      // Filter by assigned categories
      query = query.in('category', adminContext.assignedCategories);
    }

    if (normalizedStatus === 'active') {
      query = query.eq('publish_status', true);
    } else if (normalizedStatus === 'inactive') {
      query = query.eq('publish_status', false);
    } else {
      query = query.eq('publish_status', true);
    }

    if (category && category !== 'All') {
      query = query.eq('category', category);
    }

    const { data: products, error } = await query;

    if (error) throw error;

    res.json({
      success: true,
      products: products || [],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch products',
      details: error.message
    });
  }
});

// PUT /api/client-products/:id/configure - Update product description
router.put('/client-products/:id/configure', async (req, res) => {
  const { id } = req.params;
  const { description } = req.body;
  try {
    const { data, error } = await supabase
      .from('products')
      .update({ description })
      .eq('id', id)
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, product: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/products/admin-products - Get ALL products for admin (including unpublished)
router.get('/products/admin-products', authenticate, async (req, res) => {
  try {    
    // Get admin context to check SuperAdmin status and categories
    const adminContext = await getAdminContext(req.user.id);
    
    let query = supabase
      .from('products')
      .select(`
        id,
        product_id,
        product_name,
        price,
        status,
        category,
        branch,
        description,
        media_urls,
        is_published,
        publish_status,
        pickup_available
      `);

    // Filter by categories if not SuperAdmin
    if (!adminContext.isSuperAdmin) {
      if (!adminContext.assignedCategories || adminContext.assignedCategories.length === 0) {
        // No categories assigned - return empty array
        return res.json({
          success: true,
          products: []
        });
      }
      query = query.in('category', adminContext.assignedCategories);
    }
    query = query.order('inserted_at', { ascending: false });

    const { data: products, error: prodError } = await query;

    if (prodError) {
      console.error('Error fetching admin products:', prodError);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch admin products',
        details: prodError.message
      });
    }

    // Fetch stock - don't fail if stock fetch fails, just log and continue
    const { data: stocks, error: stockError } = await supabase
      .from('product_stock')
      .select('product_id, display_quantity, current_quantity, last_sync_at');

    if (stockError) {
      console.error('Error fetching stock (non-fatal):', stockError);
      // Don't return error - continue without stock data
    }

    // Merge stock into products
    const stockMap = {};
    (stocks || []).forEach(s => { stockMap[String(s.product_id).trim()] = s; });

    const productsWithStock = (products || []).map(product => {
      const stock = stockMap[String(product.product_id).trim()] || {};
      return {
        ...product,
        quantity: stock.display_quantity ?? 0,
        display_quantity: stock.display_quantity ?? 0,
        current_quantity: stock.current_quantity ?? 0,
        last_sync_at: stock.last_sync_at,
        // Ensure is_published and publish_status are explicitly included
        is_published: product.is_published ?? false,
        publish_status: product.publish_status ?? false,
      };
    });

    // Debug: Log status distribution
    const activeCount = productsWithStock.filter(p => p.is_published === true && p.publish_status === true).length;
    const isPublishedCount = productsWithStock.filter(p => p.is_published === true).length;
    const publishStatusCount = productsWithStock.filter(p => p.publish_status === true).length;
    console.log(`📊 [admin-products] Status breakdown: total=${productsWithStock.length}, is_published=true=${isPublishedCount}, publish_status=true=${publishStatusCount}, both=true=${activeCount}`);

    res.json({
      success: true,
      products: productsWithStock
    });
  } catch (error) {
    console.error('Error fetching admin products:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch admin products'
    });
  }
});

// GET /api/products/existing - Get existing published products with stock information
router.get('/products/existing', authenticate, async (req, res) => {
  try {
    
    // Get admin context to check SuperAdmin status and categories
    const adminContext = await getAdminContext(req.user.id);
    
    // First, let's check what products exist in the database
    const { data: allProducts, error: allError } = await supabase
      .from('products')
      .select('id, product_id, product_name, is_published, publish_status')
      .limit(10);
    
    // Build query for published products
    let query = supabase
      .from('products')
      .select(`
        id,
        product_id,
        product_name,
        price,
        status,
        category,
        branch,
        description,
        media_urls,
        is_published,
        publish_status,
        pickup_available
      `)
      .eq('publish_status', true);

    // Filter by categories if not SuperAdmin
    if (!adminContext.isSuperAdmin) {
      if (!adminContext.assignedCategories || adminContext.assignedCategories.length === 0) {
        // No categories assigned - return empty array
        return res.json({
          success: true,
          products: []
        });
      }
      query = query.in('category', adminContext.assignedCategories);
    }

    query = query.order('inserted_at', { ascending: false }).limit(100);

    const { data: products, error: prodError } = await query;

    if (prodError) {
      console.error('Error fetching products:', prodError);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch products',
        details: prodError.message
      });
    }

    // Fetch stock
    const { data: stocks, error: stockError } = await supabase
      .from('product_stock')
      .select('product_id, display_quantity, current_quantity, last_sync_at');

    if (stockError) {
      console.error('Error fetching stock:', stockError);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch stock',
        details: stockError.message
      });
    }

    // Merge stock into products
    const stockMap = {};
    (stocks || []).forEach(s => { stockMap[String(s.product_id).trim()] = s; });

    const productsWithStock = (products || []).map(product => {
      const stock = stockMap[String(product.product_id).trim()] || {};
      return {
        ...product,
        quantity: stock.display_quantity ?? 0,
        display_quantity: stock.display_quantity,
        current_quantity: stock.current_quantity,
        last_sync_at: stock.last_sync_at,
      };
    });

    res.json({
      success: true,
      products: productsWithStock
    });
  } catch (error) {
    console.error('Error fetching existing products:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch existing products'
    });
  }
});

// GET /api/products/pending-count - Get count of products that are not yet published
router.get('/products/pending-count', authenticate, async (req, res) => {
  try {
    // Get admin context to check SuperAdmin status and categories
    const adminContext = await getAdminContext(req.user.id);
    
    let query = supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('is_published', false);

    // Filter by categories if not SuperAdmin
    if (!adminContext.isSuperAdmin) {
      if (!adminContext.assignedCategories || adminContext.assignedCategories.length === 0) {
        // No categories assigned - return count 0
        return res.json({ count: 0 });
      }
      query = query.in('category', adminContext.assignedCategories);
    }

    const { count, error } = await query;
    
    if (error) {
      console.error('Error fetching pending count:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch pending count',
        details: error.message 
      });
    }
    
    res.json({ count: count || 0 });
  } catch (error) {
    console.error('Error in pending-count endpoint:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
});

// GET /api/products/pending - Get all products that are pending publication
router.get('/products/pending', authenticate, async (req, res) => {
  try {
    // Get admin context to check SuperAdmin status and categories
    const adminContext = await getAdminContext(req.user.id);
    
    let query = supabase
      .from('products')
      .select('*')
      .eq('is_published', false);

    // Filter by categories if not SuperAdmin
    if (!adminContext.isSuperAdmin) {
      if (!adminContext.assignedCategories || adminContext.assignedCategories.length === 0) {
        // No categories assigned - return empty array
        return res.json({
          success: true,
          products: []
        });
      }
      query = query.in('category', adminContext.assignedCategories);
    }

    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching pending products:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch pending products',
        details: error.message
      });
    }
    
    res.json({ success: true, products: data || [] });
  } catch (error) {
    console.error('Error in pending endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

// POST /api/products/publish - Publish selected products (make them visible to admin side/desktop app)
router.post('/products/publish', authenticate, async (req, res) => {
  const { productIds, description } = req.body;
  
  // Build the update object
  // Only set is_published to true - this makes products visible in desktop app
  // publish_status remains false - admin must explicitly publish to website
  const updateData = { 
    is_published: true,
    publish_status: false  // Keep publish_status as false - needs separate action to publish to website
  };
  
  // Add description if provided
  if (description && description.trim()) {
    updateData.description = description.trim();
  }
  
  const { data, error } = await supabase
    .from('products')
    .update(updateData)
    .in('id', productIds);
  
  res.json({ success: !error });
});

//PUT - Update Publish Status of a Product (Make it visible to client app)
router.put('/products/:id/status', authenticate, async (req, res) => {
  console.log('\n🔵 [ENDPOINT HIT] PUT /products/:id/status');
  console.log('Request params:', req.params);
  console.log('Request body:', req.body);
  
  const { id } = req.params;
  const { publish_status } = req.body;

  try {
    // Validate that publish_status is provided
    if (publish_status === undefined) {
      console.error('❌ publish_status is undefined in request body');
      return res.status(400).json({ 
        error: 'publish_status is required in request body' 
      });
    }
    
    // First, check the current state
    const { data: currentProduct, error: fetchError } = await supabase
      .from('products')
      .select('id, product_id, product_name, publish_status')
      .eq('id', id)
      .single();
    
    if (fetchError) {
      console.error('❌ Error fetching current product:', fetchError);
      console.error('❌ Error details:', JSON.stringify(fetchError, null, 2));
      
      // Try with product_id if id doesn't work
      const { data: productById, error: productByIdError } = await supabase
        .from('products')
        .select('id, product_id, product_name, publish_status')
        .eq('product_id', id)
        .single();
      
      if (productByIdError || !productById) {
        console.error('❌ Also failed to find by product_id:', productByIdError);
        return res.status(404).json({ error: 'Product not found' });
      }
      
      const finalId = productById.id;
      const previousStatus = productById.publish_status;
      
      // Update using the found id
      const { data, error } = await supabase
        .from('products')
        .update({ publish_status })
        .eq('id', finalId)
        .select()
        .single();
        
      if (error) {
        console.error('❌ Error updating publish status:', error);
        return res.status(500).json({ error: error.message });
      }
      
      // Send notification if product was just published (fallback path)
      if (publish_status === true && (previousStatus === false || !previousStatus)) {
        const timestamp = new Date().toISOString();
        console.log('\n========================================');
        console.log(`📧 [${timestamp}] PRODUCT PUBLISH NOTIFICATION (Fallback Path)`);
        console.log(`========================================`);
        console.log(`Product ID: ${data.id}`);
        console.log(`Product Name: ${data.product_name}`);
        console.log(`Previous Status: ${previousStatus}`);
        console.log(`New Status: ${publish_status}`);
        console.log('Checking subscribers...\n');
        
        try {
          // Get all active subscribers (using same client and query as Settings)
          const { data: subscribers, error: subscribersError } = await notificationSupabase
            .from('newsletter_subscribers')
            .select('email, is_active, id', { count: 'exact' })
            .eq('is_active', true);
          
          if (subscribersError) {
            console.error('❌ [Notification] ERROR fetching active subscribers:', subscribersError);
          } else if (!subscribers || subscribers.length === 0) {
            console.log('⚠️ [Notification] WARNING: No active subscribers found');
          } else {
            console.log(`✅ [Notification] Found ${subscribers.length} active subscriber(s)`);
            const webAppUrl = process.env.WEB_APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://izaj-ecommerce.vercel.app';
            const productName = data.product_name || 'New Product';
            const productImageUrl = data.media_urls?.[0] || null;
            // Use product_id (Shopify ID) for the URL, not the database UUID
            // The website expects numeric product_id in the URL
            const productId = data.product_id || data.id;
            console.log('📧 [Product Notification] Product ID for email link:', {
              product_id: data.product_id,
              database_id: data.id,
              using: productId,
              type: typeof productId
            });
            
            // Create beautiful product notification template
            const notificationHtml = emailService.createProductNotificationTemplate(
              productName,
              productImageUrl,
              webAppUrl,
              productId
            );
            
            console.log('📤 Starting to send email notifications...');
            Promise.all(
              subscribers.map(async (subscriber) => {
                try {
                  const normalizedEmail = subscriber.email.toLowerCase().trim();
                  await emailService.sendEmail({
                    to: normalizedEmail,
                    subject: '🎉 New Product Available at IZAJ Lighting Centre',
                    html: notificationHtml,
                    text: `New Product Available: ${productName}\n\nVisit our website: ${webAppUrl}`
                  });
                  console.log(`   ✅ Sent to: ${normalizedEmail}`);
                } catch (error) {
                  console.error(`   ❌ Failed to send to: ${subscriber.email}:`, error.message);
                }
              })
            ).catch(err => console.error('Error sending notifications:', err));
            
            console.log(`📧 [Notification] Started sending notifications to ${subscribers.length} subscribers`);
          }
        } catch (notificationError) {
          console.error('❌ [Notification] Error in notification process:', notificationError);
        }
      }
      
      return res.json({ success: true, product: data });
    }

    
    // Update the product using the actual id from the database
    const updatePayload = { publish_status };
    
    // Update by id - use RPC call to bypass triggers if they cause issues
    try {
      const { error: updateError } = await supabase
        .from('products')
        .update(updatePayload)
        .eq('id', currentProduct.id);
        
      if (updateError) {
        console.error('❌ Error updating publish status:', updateError);
        console.error('❌ Error details:', JSON.stringify(updateError, null, 2));
        
        // If it's a trigger-related error, return success anyway
        // The update might have actually succeeded despite the trigger error
        if (updateError.message.includes('notification_queue')) {
          // Don't return error - proceed to fetch the product to see if update worked
        } else {
          return res.status(500).json({ error: updateError.message });
        }
      }
    } catch (err) {
      console.error('❌ Exception during update:', err);
      // Don't return error immediately - check if update actually succeeded
    }
    
    // Then fetch the updated product separately
    const { data, error: fetchUpdatedError } = await supabase
      .from('products')
      .select('*')
      .eq('id', currentProduct.id)
      .single();
      
    if (fetchUpdatedError) {
      console.error('❌ Error fetching updated product:', fetchUpdatedError);
      return res.status(500).json({ error: fetchUpdatedError.message });
    }
    
    if (!data) {
      console.error('❌ No data returned from fetch');
      return res.status(404).json({ error: 'Product not found after update' });
    }
    
    // Verify the update actually changed the value
    if (data.publish_status !== publish_status) {
      console.error(`⚠️ WARNING: Expected publish_status ${publish_status} but got ${data.publish_status}`);
      console.error(`⚠️ WARNING: The returned product ID is ${data.id}, expected ${currentProduct.id}`);
      
      // Return error if values don't match
      return res.status(500).json({ 
        error: 'Update failed - returned value does not match expected value',
        expected: publish_status,
        got: data.publish_status
      });
    }
    
    // Debug: Log current status values
    console.log(`\n🔍 [Debug] Product publish status check:`);
    console.log(`   Product ID: ${currentProduct.id}`);
    console.log(`   Current publish_status: ${currentProduct.publish_status} (type: ${typeof currentProduct.publish_status})`);
    console.log(`   New publish_status: ${publish_status} (type: ${typeof publish_status})`);
    console.log(`   Condition check: publish_status === true: ${publish_status === true}`);
    console.log(`   Condition check: currentProduct.publish_status === false: ${currentProduct.publish_status === false}`);
    console.log(`   Condition check: !currentProduct.publish_status: ${!currentProduct.publish_status}`);
    console.log(`   Will trigger notification: ${publish_status === true && (currentProduct.publish_status === false || !currentProduct.publish_status)}\n`);
    
    // Send notification to subscribers if product was just published
    if (publish_status === true && (currentProduct.publish_status === false || !currentProduct.publish_status)) {
      const timestamp = new Date().toISOString();
      console.log('\n========================================');
      console.log(`📧 [${timestamp}] PRODUCT PUBLISH NOTIFICATION`);
      console.log(`========================================`);
      console.log(`Product ID: ${data.id}`);
      console.log(`Product Name: ${data.product_name}`);
      console.log(`Previous Status: ${currentProduct.publish_status}`);
      console.log(`New Status: ${publish_status}`);
      console.log('Checking subscribers...\n');
      
      try {
        // First, let's check ALL subscribers to see what's in the table (using notification client)
        const { data: allSubscribers, error: allError } = await notificationSupabase
          .from('newsletter_subscribers')
          .select('email, is_active, id')
          .limit(10);
        
        console.log('🔍 [Debug] Checking newsletter_subscribers table...');
        if (allError) {
          console.error('❌ [Debug] Error fetching all subscribers:', allError);
        } else {
          console.log(`📊 [Debug] Total subscribers in table: ${allSubscribers?.length || 0}`);
          if (allSubscribers && allSubscribers.length > 0) {
            console.log('📋 [Debug] Sample subscribers:');
            allSubscribers.forEach((sub, idx) => {
              console.log(`   ${idx + 1}. Email: ${sub.email}, is_active: ${sub.is_active}, id: ${sub.id}`);
            });
          }
        }
        console.log('');
        
        // Get all active subscribers (using same client and query as Settings)
        const { data: subscribers, error: subscribersError } = await notificationSupabase
          .from('newsletter_subscribers')
          .select('email, is_active, id', { count: 'exact' })
          .eq('is_active', true);
        
        if (subscribersError) {
          console.error('❌ [Notification] ERROR fetching active subscribers:', subscribersError);
          console.error('Error details:', JSON.stringify(subscribersError, null, 2));
        } else if (!subscribers || subscribers.length === 0) {
          console.log('⚠️ [Notification] WARNING: No active subscribers found in database');
          console.log('   Make sure you have subscribers with is_active = true in newsletter_subscribers table');
          console.log(`   Found ${allSubscribers?.length || 0} total subscriber(s) in table`);
          if (allSubscribers && allSubscribers.length > 0) {
            const activeCount = allSubscribers.filter(s => s.is_active === true).length;
            const inactiveCount = allSubscribers.filter(s => s.is_active === false || s.is_active === null).length;
            console.log(`   Active: ${activeCount}, Inactive/Null: ${inactiveCount}`);
          }
          console.log('');
        } else {
          console.log(`✅ [Notification] Found ${subscribers.length} active subscriber(s)`);
          console.log('Subscriber emails:', subscribers.map(s => s.email).join(', '));
          console.log('');
          
          const webAppUrl = process.env.WEB_APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://izaj-ecommerce.vercel.app';
          const productName = data.product_name || 'New Product';
          const productImageUrl = data.media_urls?.[0] || null;
          // Use product_id (Shopify ID) for the URL, not the database UUID
          // The website expects numeric product_id in the URL
          const productId = data.product_id || data.id;
          
          // Create beautiful product notification template
          const notificationHtml = emailService.createProductNotificationTemplate(
            productName,
            productImageUrl,
            webAppUrl,
            productId
          );
          
          console.log('📤 Starting to send email notifications...');
          let successCount = 0;
          let failCount = 0;
          
          // Send emails to all subscribers (async, don't wait)
          Promise.all(
            subscribers.map(async (subscriber) => {
              try {
                const normalizedEmail = subscriber.email.toLowerCase().trim();
                await emailService.sendEmail({
                  to: normalizedEmail,
                  subject: '🎉 New Product Available at IZAJ Lighting Centre',
                  html: notificationHtml,
                  text: `New Product Available: ${productName}\n\nVisit our website: ${webAppUrl}`
                });
                successCount++;
                console.log(`   ✅ Sent to: ${normalizedEmail}`);
              } catch (error) {
                failCount++;
                console.error(`   ❌ Failed to send to: ${subscriber.email}`);
                console.error(`      Error: ${error.message}`);
              }
            })
          ).then(() => {
            console.log('\n📊 Notification Summary:');
            console.log(`   Total: ${subscribers.length}`);
            console.log(`   Success: ${successCount}`);
            console.log(`   Failed: ${failCount}`);
            console.log('========================================\n');
          }).catch(err => {
            console.error('❌ [Notification] CRITICAL ERROR in notification process:', err);
            console.error('Error stack:', err.stack);
            console.log('========================================\n');
          });
        }
      } catch (notificationError) {
        // Don't fail the request if notification fails
        console.error('❌ [Notification] EXCEPTION in notification process:', notificationError);
        console.error('Error stack:', notificationError.stack);
        console.log('========================================\n');
      }
    } else {
      console.log(`ℹ️ [Notification] Product ${data.id} - Status unchanged (${currentProduct.publish_status} -> ${publish_status}), no notification sent`);
    }
    
    res.json({ success: true, product: data });
  } catch (err) {
    console.error('❌ Error in publish status update:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT - Update Pickup Availability Status of a Product
router.put('/products/:id/pickup-status', authenticate, async (req, res) => {
  const { id } = req.params;
  const { pickup_available } = req.body;

  try {
    // First, let's check if the product exists
    const { data: existingProduct, error: fetchError } = await supabase
      .from('products')
      .select('id, product_id, product_name, pickup_available')
      .eq('id', id)
      .single();
    
    if (fetchError || !existingProduct) {
      console.error('❌ Product not found or fetch error:', fetchError);
      // Try with product_id instead
      const { data: productById, error: productByIdError } = await supabase
        .from('products')
        .select('id, product_id, product_name, pickup_available')
        .eq('product_id', id)
        .single();
      
      if (productByIdError || !productById) {
        return res.status(404).json({ 
          error: 'Product not found', 
          details: fetchError?.message,
          attemptedIds: { id, product_id: id }
        });
      }
      
      // Update using the found id
      const { data, error } = await supabase
        .from('products')
        .update({ pickup_available })
        .eq('id', productById.id)
        .select()
        .single();
        
      if (error) {
        console.error('❌ Error updating pickup status:', error);
        return res.status(500).json({ error: error.message, code: error.code });
      }
      
      return res.json({ success: true, product: data });
    }
    
    const { data, error } = await supabase
      .from('products')
      .update({ pickup_available })
      .eq('id', id)
      .select()
      .single();
      
    if (error) {
      console.error('❌ Error updating pickup status:', error);
      return res.status(500).json({ error: error.message, code: error.code });
    }
    
    res.json({ success: true, product: data });
  } catch (err) {
    console.error('❌ Error in pickup status update:', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/products/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    // Fetch product details before deletion for audit logging
    const { data: productData, error: fetchError } = await supabase
      .from('products')
      .select('id, product_id, product_name')
      .eq('id', id)
      .single();

    if (fetchError || !productData) {
      return res.status(404).json({ error: "Product not found" });
    }

    const { data, error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) {
      console.error("Supabase delete error:", error);
      return res.status(500).json({ error: error.message });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Log audit event with product_id in details
    try {
      await logAuditEvent(req.user.id, AuditActions.DELETE_PRODUCT, {
        product_id: productData.product_id,
        product_name: productData.product_name,
        id: productData.id
      }, req);
    } catch (auditError) {
      console.error('⚠️ Audit logging failed (non-critical):', auditError);
    }

    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error("Unexpected delete error:", err);
    return res.status(500).json({ error: err.message });
  }
});



// POST /api/products/publish-all - Publish all products with is_published=true to website (set publish_status=true)
router.post('/products/publish-all', authenticate, async (req, res) => {
  console.log('\n🔵 [ENDPOINT HIT] POST /products/publish-all');
  console.log('Request body:', req.body);
  console.log('User ID:', req.user?.id);
  
  try {
    // Get admin context to check SuperAdmin status and categories
    const adminContext = await getAdminContext(req.user.id);
    
    // Build query to find products with is_published=true but publish_status=false
    let query = supabase
      .from('products')
      .select('id')
      .eq('is_published', true)
      .eq('publish_status', false);
    
    // Filter by categories if not SuperAdmin
    if (!adminContext.isSuperAdmin) {
      if (!adminContext.assignedCategories || adminContext.assignedCategories.length === 0) {
        return res.json({
          success: true,
          message: 'Published 0 products',
          products: []
        });
      }
      query = query.in('category', adminContext.assignedCategories);
    }
    
    // First, get the product IDs
    const { data: productsToPublish, error: fetchError } = await query;
    
    if (fetchError) {
      console.error('Error fetching products to publish:', fetchError);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch products',
        details: fetchError.message
      });
    }
    
    if (!productsToPublish || productsToPublish.length === 0) {
      return res.json({
        success: true,
        message: 'No products to publish',
        products: []
      });
    }
    
    // Update only publish_status to true (keep is_published as true)
    const productIds = productsToPublish.map(p => p.id);
    const { data: updatedProducts, error: updateError } = await supabase
      .from('products')
      .update({ 
        publish_status: true 
      })
      .in('id', productIds)
      .select();
    
    if (updateError) {
      console.error('Error publishing products:', updateError);
      return res.status(500).json({
        success: false,
        error: 'Failed to publish products',
        details: updateError.message
      });
    }

    // Send notifications to subscribers for newly published products
    if (updatedProducts && updatedProducts.length > 0) {
      const timestamp = new Date().toISOString();
      console.log('\n========================================');
      console.log(`📧 [${timestamp}] PUBLISH ALL - NOTIFICATION`);
      console.log(`========================================`);
      console.log(`Total Products Published: ${updatedProducts.length}`);
      console.log(`Product Names: ${updatedProducts.map(p => p.product_name || 'New Product').join(', ')}`);
      console.log('Checking subscribers...\n');
      
      try {
        // First, let's check ALL subscribers to see what's in the table (using notification client)
        const { data: allSubscribers, error: allError } = await notificationSupabase
          .from('newsletter_subscribers')
          .select('email, is_active, id')
          .limit(10);
        
        console.log('🔍 [Debug] Checking newsletter_subscribers table...');
        if (allError) {
          console.error('❌ [Debug] Error fetching all subscribers:', allError);
        } else {
          console.log(`📊 [Debug] Total subscribers in table: ${allSubscribers?.length || 0}`);
          if (allSubscribers && allSubscribers.length > 0) {
            console.log('📋 [Debug] Sample subscribers:');
            allSubscribers.forEach((sub, idx) => {
              console.log(`   ${idx + 1}. Email: ${sub.email}, is_active: ${sub.is_active}, id: ${sub.id}`);
            });
          }
        }
        console.log('');
        
        // Get all active subscribers (using same client and query as Settings)
        const { data: subscribers, error: subscribersError } = await notificationSupabase
          .from('newsletter_subscribers')
          .select('email, is_active, id', { count: 'exact' })
          .eq('is_active', true);
        
        if (subscribersError) {
          console.error('❌ [Notification] ERROR fetching active subscribers:', subscribersError);
          console.error('Error details:', JSON.stringify(subscribersError, null, 2));
        } else if (!subscribers || subscribers.length === 0) {
          console.log('⚠️ [Notification] WARNING: No active subscribers found in database');
          console.log('   Make sure you have subscribers with is_active = true in newsletter_subscribers table');
          console.log(`   Found ${allSubscribers?.length || 0} total subscriber(s) in table`);
          if (allSubscribers && allSubscribers.length > 0) {
            const activeCount = allSubscribers.filter(s => s.is_active === true).length;
            const inactiveCount = allSubscribers.filter(s => s.is_active === false || s.is_active === null).length;
            console.log(`   Active: ${activeCount}, Inactive/Null: ${inactiveCount}`);
          }
          console.log('');
        } else {
          console.log(`✅ [Notification] Found ${subscribers.length} active subscriber(s)`);
          console.log('Subscriber emails:', subscribers.map(s => s.email).join(', '));
          console.log('');
          
          const webAppUrl = process.env.WEB_APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://izaj-ecommerce.vercel.app';
          
          // For multiple products, use the first product for the template or create a combined message
          const firstProduct = updatedProducts[0];
          const productName = updatedProducts.length === 1 
            ? firstProduct.product_name || 'New Product'
            : `${updatedProducts.length} New Products`;
          const productImageUrl = firstProduct?.media_urls?.[0] || null;
          // Use product_id (Shopify ID) for the URL, not the database UUID
          // The website expects numeric product_id in the URL
          const productId = firstProduct?.product_id || firstProduct?.id;
          
          // Create beautiful product notification template
          const notificationHtml = emailService.createProductNotificationTemplate(
            productName,
            productImageUrl,
            webAppUrl,
            productId
          );
          
          console.log('📤 Starting to send email notifications...');
          let successCount = 0;
          let failCount = 0;
          
          // Send emails to all subscribers (async, don't wait)
          Promise.all(
            subscribers.map(async (subscriber) => {
              try {
                const normalizedEmail = subscriber.email.toLowerCase().trim();
                await emailService.sendEmail({
                  to: normalizedEmail,
                  subject: `🎉 ${updatedProducts.length} New Product${updatedProducts.length > 1 ? 's' : ''} Available at IZAJ Lighting Centre`,
                  html: notificationHtml,
                  text: `${updatedProducts.length} New Product${updatedProducts.length > 1 ? 's' : ''} Available\n\nVisit our website: ${webAppUrl}`
                });
                successCount++;
                console.log(`   ✅ Sent to: ${normalizedEmail}`);
              } catch (error) {
                failCount++;
                console.error(`   ❌ Failed to send to: ${subscriber.email}`);
                console.error(`      Error: ${error.message}`);
              }
            })
          ).then(() => {
            console.log('\n📊 Notification Summary:');
            console.log(`   Total: ${subscribers.length}`);
            console.log(`   Success: ${successCount}`);
            console.log(`   Failed: ${failCount}`);
            console.log('========================================\n');
          }).catch(err => {
            console.error('❌ [Notification] CRITICAL ERROR in notification process:', err);
            console.error('Error stack:', err.stack);
            console.log('========================================\n');
          });
        }
      } catch (notificationError) {
        console.error('❌ [Notification] EXCEPTION in notification process:', notificationError);
        console.error('Error stack:', notificationError.stack);
        console.log('========================================\n');
      }
    }

    res.json({
      success: true,
      message: `Published ${updatedProducts?.length || 0} products to website`,
      products: updatedProducts
    });
  } catch (error) {
    console.error('Error in publish-all:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to publish products',
      details: error.message
    });
  }
});

// GET /api/products/debug - Debug endpoint to check all products
router.get('/products/debug', authenticate, async (req, res) => {
  try {
    const { data: allProducts, error } = await supabase
      .from('products')
      .select('*')
      .limit(20);
    
    if (error) {
      console.error('Error fetching products:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch products',
        details: error.message
      });
    }
    
    res.json({
      success: true,
      total: allProducts?.length || 0,
      published: allProducts?.filter(p => p.is_published)?.length || 0,
      publishStatusTrue: allProducts?.filter(p => p.publish_status)?.length || 0,
      products: allProducts
    });
  } catch (error) {
    console.error('Error in debug endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Debug failed',
      details: error.message
    });
  }
});

// POST /api/products/test-insert - Test inserting a single product
router.post('/products/test-insert', authenticate, async (req, res) => {
  try {
    const testProduct = {
      product_id: 'test-' + Date.now(),
      product_name: 'Test Product',
      price: 100,
      status: 'active',
      category: 'Test Category',
      branch: 'Test Branch',
      is_published: true,
      publish_status: true,
      on_sale: false
    };
    
    const { data, error } = await supabase
      .from('products')
      .insert(testProduct)
      .select();
    
    if (error) {
      console.error('Test insert failed:', error);
      return res.status(500).json({
        success: false,
        error: 'Test insert failed',
        details: error.message,
        code: error.code
      });
    }
    
    res.json({
      success: true,
      message: 'Test product inserted successfully',
      product: data
    });
  } catch (error) {
    console.error('Error in test insert:', error);
    res.status(500).json({
      success: false,
      error: 'Test insert failed',
      details: error.message
    });
  }
});

// PUT /api/products/:id - Edit product details
router.put('/products/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
      
    // Validate required fields if provided
    if (updateData.product_name !== undefined && !updateData.product_name?.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Product name cannot be empty'
      });
    }
    
    if (updateData.price !== undefined && (isNaN(updateData.price) || updateData.price < 0)) {
      return res.status(400).json({
        success: false,
        error: 'Price must be a valid positive number'
      });
    }
    
    // Fetch product before update to get product_id
    const { data: oldProduct, error: fetchError } = await supabase
      .from('products')
      .select('id, product_id, product_name')
      .eq('id', id)
      .single();
    
    if (fetchError || !oldProduct) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }
    
    // Prepare update object with only provided fields
    const allowedFields = [
      'product_name', 'price', 'status', 'category', 'branch', 
      'description', 'is_published', 'publish_status', 
      'on_sale', 'media_urls'
    ];
    
    const filteredUpdateData = {};
    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key) && updateData[key] !== undefined) {
        filteredUpdateData[key] = updateData[key];
      }
    });
    
          
    const { data, error } = await supabase
      .from('products')
      .update(filteredUpdateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating product:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to update product',
        details: error.message,
        code: error.code
      });
    }
    
    if (!data) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }
    
    // Log audit event with product_id and changed fields
    try {
      await logAuditEvent(req.user.id, AuditActions.UPDATE_PRODUCT, {
        product_id: oldProduct.product_id,
        product_name: oldProduct.product_name,
        id: oldProduct.id,
        changed_fields: filteredUpdateData
      }, req);
    } catch (auditError) {
      console.error('⚠️ Audit logging failed (non-critical):', auditError);
    }
    
    res.json({
      success: true,
      message: 'Product updated successfully',
      product: data
    });
    
  } catch (error) {
    console.error('Error in product update:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update product',
      details: error.message
    });
  }
});

// PATCH /api/products/:id - Partial update for specific fields
router.patch('/products/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { field, value } = req.body;
    
    // Fetch product before update to get product_id
    const { data: oldProduct, error: fetchError } = await supabase
      .from('products')
      .select('id, product_id, product_name')
      .eq('id', id)
      .single();
    
    if (fetchError || !oldProduct) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }
    
    // Validate field
    const allowedFields = [
      'product_name', 'price', 'status', 'category', 'branch', 
      'description', 'is_published', 'publish_status', 
      'on_sale', 'media_urls'
    ];
    
    if (!allowedFields.includes(field)) {
      return res.status(400).json({
        success: false,
        error: `Field '${field}' is not allowed for update`
      });
    }
    
    // Validate value based on field type
    if (field === 'price' && (isNaN(value) || value < 0)) {
      return res.status(400).json({
        success: false,
        error: 'Price must be a valid positive number'
      });
    }
    
    if (field === 'product_name' && !value?.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Product name cannot be empty'
      });
    }
    
    const updateData = {
      [field]: value
      // Note: updated_at column doesn't exist in products table, so we skip it
    };
    
    const { data, error } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating product field:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to update product field',
        details: error.message,
        code: error.code
      });
    }
    
    if (!data) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }
    
    // Log audit event with product_id, field, and value
    try {
      await logAuditEvent(req.user.id, AuditActions.UPDATE_PRODUCT, {
        product_id: oldProduct.product_id,
        product_name: oldProduct.product_name,
        id: oldProduct.id,
        field: field,
        value: value
      }, req);
    } catch (auditError) {
      console.error('⚠️ Audit logging failed (non-critical):', auditError);
    }
    
    res.json({
      success: true,
      message: `Product ${field} updated successfully`,
      product: data
    });
    
  } catch (error) {
    console.error('Error in product field update:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update product field',
      details: error.message
    });
  }
});

// GET /api/products/stock-status - Get detailed stock status with sync information
router.get('/products/stock-status', authenticate, async (req, res) => {
  try {
    // First, let's directly query product_stock to see what's there
    const { data: directStock, error: directError } = await supabase
      .from('product_stock')
      .select('product_id, display_quantity, reserved_quantity, current_quantity')
      .limit(5);
    
    // Removed verbose log to reduce terminal noise
    
    const { data, error } = await supabase
      .from('products')
      .select(`
        product_id,
        product_name,
        product_stock(
          current_quantity,
          display_quantity,
          reserved_quantity,
          last_sync_at,
          inventory_updated_at,
          display_synced_at
        )
      `);

    if (error) {
      console.error('Error fetching stock status:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch stock status',
        details: error.message 
      });
    }

    // Removed verbose log to reduce terminal noise

    const stockStatus = (data || []).map(product => {
      // Handle both array and object format from Supabase relation
      let stock = {};
      if (Array.isArray(product.product_stock)) {
        stock = product.product_stock[0] || {};
      } else if (product.product_stock && typeof product.product_stock === 'object') {
        stock = product.product_stock;
      }

      return buildStockStatusEntry(product, stock);
    });

    // Removed verbose log to reduce terminal noise

    res.json({
      success: true,
      products: stockStatus,
      summary: {
        total: stockStatus.length,
        needsSync: stockStatus.filter(p => p.needs_sync).length,
        withoutStock: stockStatus.filter(p => !p.has_stock_entry).length
      }
    });

  } catch (err) {
    console.error('Error fetching stock status:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/products/product-status - Get publish status of all published products
router.get('/products/product-status', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('publish_status')
      .eq('publish_status', true);

    if (error) {
      console.error('Error fetching product status:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch product status',
        details: error.message 
      });
    }

    return res.status(200).json({ 
      statusList: data.map((item) => item.publish_status) 
    });

  } catch (err) {
    console.error('Unexpected error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/products/:productId/stock - Get stock info for a single product_id
router.get('/products/:productId/stock', authenticate, async (req, res) => {
  try {
    const { productId } = req.params;
    const { data, error } = await supabase
      .from('product_stock')
      .select('display_quantity, current_quantity, reserved_quantity, last_sync_at')
      .eq('product_id', productId)
      .maybeSingle();

    if (error) {
      return res.status(500).json({ success: false, error: 'Failed to fetch stock', details: error.message });
    }

    if (!data) {
      return res.status(404).json({ success: false, error: 'No stock found for product' });
    }

    return res.json({ success: true, product_id: productId, stock: data });
  } catch (err) {
    console.error('Error fetching single product stock:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/products/:id - Get single product details
router.get('/products/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate that id is a valid UUID (not a route name like "product-status" or "stock-status")
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid product ID format',
        details: 'Product ID must be a valid UUID'
      });
    }
    
    const { data: product, error } = await supabase
      .from('products')
      .select(`
        id,
        product_id,
        product_name,
        price,
        status,
        category,
        branch,
        description,
        is_published,
        publish_status,
        on_sale,
        pickup_available,
        media_urls,
        inserted_at,
        product_stock (
          display_quantity,
          current_quantity,
          last_sync_at
        )
      `)
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error fetching product:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch product',
        details: error.message,
        code: error.code
      });
    }
    
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }
    
    res.json({
      success: true,
      product: product
    });
    
  } catch (error) { 
    res.status(500).json({
      success: false,
      error: 'Failed to fetch product',
      details: error.message
    });
  }
});

export default router;