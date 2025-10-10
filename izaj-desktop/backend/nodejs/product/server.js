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
      is_published: false,
      publish_status: false,
      on_sale: false,
    }));

    const { data: upserted, error: upsertErr } = await supabase
      .from('products')
      .upsert(rowsForClient, {
        onConflict: 'product_id',
        ignoreDuplicates: false
      })
      .select();

    if (upsertErr) {
      console.error('Error inserting into client DB:', upsertErr);
      return res.status(500).json({
        error: 'Failed to insert products into client database',
        details: upsertErr.message
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
    const { page = 1, limit = 100, status, category, search } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

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
      .eq('is_published', true)
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

// GET /api/products/existing - Get existing published products with stock information
router.get('/products/existing', authenticate, async (req, res) => {
  try {
    // Fetch products
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
        is_published
      `)
      .eq('is_published', true)
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

  try {
    const { data, error } = await supabase
      .from('products')
      .update({ publish_status: true })
      .eq('id', id)
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, product: data });
  } catch (err) {
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



export default router;