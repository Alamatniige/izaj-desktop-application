import express from 'express';
import  { supabase } from '../supabaseClient.js';
import { supabase as productSupabase } from '../supabaseProduct.js';
import authenticate from '../util/middlerware.js';
import multer from 'multer';

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Helper function: Update or create product stock quantities in database
const updateProductStock = async (productId, inventoryQuantity) => {
  try {
    const timestamp = new Date().toISOString();

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
          display_quantity: inventoryQuantity, // Sync with current
          last_sync_at: timestamp,
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
          display_quantity: inventoryQuantity,
          reserved_quantity: 0,
          last_sync_at: timestamp,
          updated_at: timestamp
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
    const { after, limit = 100, sync } = req.query;

    if (!sync || sync === 'false') {
      return res.redirect('/products/existing');
    }

    let invQuery = productSupabase
      .from('centralized_product')
      .select(`
        id,
        product_name,
        quantity,
        price,
        status,
        category:category ( category_name ),
        branch:branch ( location )
      `)
      .order('created_at', { ascending: true })
      .limit(parseInt(limit, 10));

    if (after) invQuery = invQuery.gt('created_at', after);

    const { data: invRows, error: fetchErr } = await invQuery;
    if (fetchErr) {
      console.error('Error fetching products:', fetchErr);
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

    // Insertion of Inventory DB to  DB
    const rowsForClient = invRows.map((r) => ({
      product_id: r.id,
      product_name: r.product_name,
      price: r.price,
      status: r.status ?? 'active',
      category: r.category?.category_name?.trim() || null,
      branch: r.branch?.location?.trim() || null,
      is_published: true,  // Auto-publish synced products
      publish_status: true, // Auto-publish synced products
      on_sale: false,
      pickup_available: true, // Default to available for pickup
    }));

    // Debug: Log the service role configuration
    console.log('Using service role for database operations:', {
      url: process.env.SUPABASE_URL ? 'Set' : 'Missing',
      serviceKey: process.env.SUPABASE_SERVICE_KEY ? 'Set' : 'Missing'
    });

    // Try to insert with service role, if RLS still blocks, use direct SQL
    let upserted, upsertErr;
    
    try {
      const result = await supabase
        .from('products')
        .upsert(rowsForClient, {
          onConflict: 'product_id',
          ignoreDuplicates: false
        })
        .select();
      
      upserted = result.data;
      upsertErr = result.error;
    } catch (error) {
      console.error('Upsert operation failed:', error);
      upsertErr = error;
    }

    // If RLS still blocks, try individual inserts
    if (upsertErr && upsertErr.code === '42501') {
      console.log('RLS policy violation detected, trying individual inserts...');
      
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
        
        console.log(`Individual inserts: ${insertResults.filter(r => r.data).length} successful, ${insertResults.filter(r => r.error).length} failed`);
      } catch (individualError) {
        console.error('Individual inserts also failed:', individualError);
        upsertErr = individualError;
      }
    }

    if (upsertErr) {
      console.error('Error inserting into client DB:', upsertErr);
      return res.status(500).json({
        error: 'Failed to insert products into client database',
        details: upsertErr.message,
        code: upsertErr.code
      });
    }

    const syncedCount = upserted ? upserted.length : rowsForClient.length;
    const timestamp = new Date().toISOString();
    const stockResults = [];

    for (const product of invRows) {
      const result = await updateProductStock(product.id, product.quantity || 0);
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
        console.error('Error syncing products:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to sync products',
          details: error.message
        });
      }
  });

// GET /api/client-products - Get published products for client app with pagination and filters
router.get('/client-products', async (req, res) => {
  try {
    console.log('🔍 Fetching client products...');
    const { page = 1, limit = 100, status, category, search } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Debug: Check what products exist
    const { data: debugProducts } = await supabase
      .from('products')
      .select('id, product_id, product_name, publish_status, is_published')
      .limit(5);
    
    console.log('📊 Debug - All products:', debugProducts);
    console.log('📊 Debug - Products with publish_status=true:', debugProducts?.filter(p => p.publish_status));

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
        image_url,
        publish_status,
        is_published,
        pickup_available,
        product_stock (
          display_quantity,
          last_sync_at
        )
      `)
      .eq('publish_status', true)
      .order('inserted_at', { ascending: false });

    if (status && status !== 'all') {
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
      console.error('Error fetching client products:', fetchError);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch products from client database',
        details: fetchError.message
      });
    }

    const transformedProducts = products.map(product => {
    const stock = product.product_stock || {};
    return {
      ...product,
      display_quantity: stock.display_quantity ?? 0,
      last_sync_at: stock.last_sync_at,
      product_stock: undefined
    };
  });


    const { count: totalCount, error: countError } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('publish_status', true);

    if (countError) {
      console.error('Error getting product count:', countError);
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
    console.error('Server error in client-products:', error);
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

    const mediaUrls = [];

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

    mediaUrls.push(usrlData.publicUrl);
    }
    
    const { error: dbError } = await supabase
      .from('products')
      .update({ media_urls: mediaUrls })
      .eq('id', productId);
      
      if (dbError) {
      return res.status(500).json({ error: 'Failed to update product media URLs', details: dbError.message });
      }

        res.json({ success: true, mediaUrls });
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
      console.error('Error fetching product media:', error);
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
    console.error('Server error in fetching product media:', error);
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
    const { data: categories, error } = await supabase
      .from('products')
      .select('category')
      .eq('publish_status', true)
      .not('category', 'is', null)
      .order('category');

    if (error) {
      console.error('Error fetching categories:', error);
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
    console.error('Server error in categories:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

// GET /api/client-products - Get all products that are active
router.get('/active-client-products', async (req, res) => {
  const { status, category } = req.query;
  const rawStatus = status || '';
  const normalizedStatus = rawStatus.toString().trim().toLowerCase();
    
  try {
    let query = supabase.from('products').select('*');

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

// PUT /api/client-products/:id/configure - Update product description and image URL
router.put('/client-products/:id/configure', async (req, res) => {
  const { id } = req.params;
  const { description, image_url } = req.body;
  try {
    const { data, error } = await supabase
      .from('products')
      .update({ description, image_url })
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
    console.log('🔍 Fetching ALL products for admin...');
    
    const { data: products, error: prodError } = await supabase
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
        image_url,
        is_published,
        publish_status,
        pickup_available
      `)
      .order('inserted_at', { ascending: false })
      .limit(100);

    if (prodError) {
      console.error('Error fetching admin products:', prodError);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch admin products',
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
    console.log('🔍 Fetching existing products for admin...');
    
    // First, let's check what products exist in the database
    const { data: allProducts, error: allError } = await supabase
      .from('products')
      .select('id, product_id, product_name, is_published, publish_status')
      .limit(10);
    
    console.log('📊 All products in database:', allProducts);
    console.log('📊 Products with is_published=true:', allProducts?.filter(p => p.is_published));
    console.log('📊 Products with publish_status=true:', allProducts?.filter(p => p.publish_status));
    
    // Fetch only PUBLISHED products for admin (publish_status = true)
    const { data: products, error: prodError } = await supabase
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
        image_url,
        is_published,
        publish_status,
        pickup_available
      `)
      .eq('publish_status', true)
      .order('inserted_at', { ascending: false })
      .limit(100);

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
  const { count, error } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('is_published', false);
  
  res.json({ count: count || 0 });
});

// GET /api/products/pending - Get all products that are pending publication
router.get('/products/pending', authenticate, async (req, res) => {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_published', false);
  
  res.json({ success: true, products: data || [] });
});

// POST /api/products/publish - Publish selected products (make them visible to admin side)
router.post('/products/publish', authenticate, async (req, res) => {
  const { productIds, description } = req.body;
  
  // Build the update object
  const updateData = { 
    is_published: true,
    publish_status: true 
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
  const { id } = req.params;
  const { publish_status } = req.body;

  try {
    console.log(`📢 Updating publish status for product ID: ${id}, new value: ${publish_status}`);
    console.log(`📦 Full request body:`, req.body);
    
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
      
      console.log(`📊 Found product by product_id:`, productById);
      const finalId = productById.id;
      
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
      
      console.log('✅ Publish status updated successfully:', data);
      return res.json({ success: true, product: data });
    }
    
    console.log(`📊 Current publish_status: ${currentProduct.publish_status}, Updating to: ${publish_status}`);
    console.log(`📊 Product being updated:`, { id: currentProduct.id, product_id: currentProduct.product_id, name: currentProduct.product_name });
    console.log(`📊 ID being used for update:`, id);
    console.log(`📊 Value being set in update:`, { publish_status, type: typeof publish_status });
    
    // Update the product using the actual id from the database
    const updatePayload = { publish_status };
    console.log(`📊 Update payload:`, updatePayload);
    
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
          console.log('⚠️ Trigger error detected but continuing - update may have succeeded');
          console.log('⚠️ You need to fix the notification_queue trigger in Supabase');
          // Don't return error - proceed to fetch the product to see if update worked
        } else {
          return res.status(500).json({ error: updateError.message });
        }
      }
    } catch (err) {
      console.error('❌ Exception during update:', err);
      // Don't return error immediately - check if update actually succeeded
    }
    
    console.log('✅ Update query executed successfully (proceeding to verify)');
    
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
    
    console.log('✅ Publish status updated successfully:', data);
    console.log(`✅ New publish_status: ${data.publish_status}`);
    console.log(`✅ Updated product details:`, { id: data.id, product_id: data.product_id, name: data.product_name });
    
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
    console.log(`📦 Updating pickup availability for product ID: ${id}, new value: ${pickup_available}`);
    console.log(`📦 Request body:`, req.body);
    
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
      
      console.log(`📦 Found product by product_id:`, productById);
      
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
      
      console.log('✅ Pickup status updated successfully:', data);
      return res.json({ success: true, product: data });
    }
    
    console.log(`📦 Existing product found:`, existingProduct);
    console.log(`📦 Updating pickup_available from ${existingProduct.pickup_available} to ${pickup_available}`);
    
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
    
    console.log('✅ Pickup status updated successfully:', data);
    res.json({ success: true, product: data });
  } catch (err) {
    console.error('❌ Error in pickup status update:', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/products/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  try {
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

    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error("Unexpected delete error:", err);
    return res.status(500).json({ error: err.message });
  }
});



// POST /api/products/publish-all - Publish all unpublished products
router.post('/products/publish-all', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .update({ 
        is_published: true,
        publish_status: true 
      })
      .eq('publish_status', false)
      .select();
    
    if (error) {
      console.error('Error publishing products:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to publish products',
        details: error.message
      });
    }

    res.json({
      success: true,
      message: `Published ${data?.length || 0} products`,
      products: data
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
    console.log('🔍 Debug: Checking all products in database...');
    
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
    
    console.log('📊 Total products found:', allProducts?.length);
    console.log('📊 Products with is_published=true:', allProducts?.filter(p => p.is_published)?.length);
    console.log('📊 Products with publish_status=true:', allProducts?.filter(p => p.publish_status)?.length);
    
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
    console.log('🧪 Testing product insertion...');
    
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
    
    console.log('✅ Test insert successful:', data);
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
    
    console.log(`✏️ Editing product ${id} with data:`, updateData);
    
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
    
    // Prepare update object with only provided fields
    const allowedFields = [
      'product_name', 'price', 'status', 'category', 'branch', 
      'description', 'image_url', 'is_published', 'publish_status', 
      'on_sale', 'media_urls'
    ];
    
    const filteredUpdateData = {};
    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key) && updateData[key] !== undefined) {
        filteredUpdateData[key] = updateData[key];
      }
    });
    
    // Add updated timestamp
    filteredUpdateData.updated_at = new Date().toISOString();
    
    console.log('📝 Filtered update data:', filteredUpdateData);
    
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
    
    console.log('✅ Product updated successfully:', data);
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
    
    console.log(`🔧 Updating product ${id} field '${field}' to:`, value);
    
    // Validate field
    const allowedFields = [
      'product_name', 'price', 'status', 'category', 'branch', 
      'description', 'image_url', 'is_published', 'publish_status', 
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
      [field]: value,
      updated_at: new Date().toISOString()
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
    
    console.log('✅ Product field updated successfully:', data);
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

// GET /api/products/:id - Get single product details
router.get('/products/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`🔍 Fetching product details for ID: ${id}`);
    
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
        image_url,
        is_published,
        publish_status,
        on_sale,
        pickup_available,
        media_urls,
        inserted_at,
        updated_at,
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
    
    console.log('✅ Product fetched successfully:', product);
    res.json({
      success: true,
      product: product
    });
    
  } catch (error) {
    console.error('Error in product fetch:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch product',
      details: error.message
    });
  }
});

export default router;