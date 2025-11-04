import express from 'express';
import  { supabase } from '../supabaseClient.js';


const router = express.Router();

// Get all published products
router.get('/products', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('publish_status', true);

    if (error) throw error;
    res.json(data);
  } catch (error) {
    next(error);
  }
});

// Get all published products on sale with sale details
router.get('/onsale/products', async (req, res, next) => {
  try {
    // Fetch all products marked as on_sale with their sale details
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        sale(*)
      `)
      .eq('on_sale', true);

    if (error) {
      console.error('Error fetching on-sale products:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch on-sale products',
        details: error.message
      });
    }
    
    // Filter for published products
    const publishedData = data?.filter(p => p.publish_status === true) || [];
    
    res.json(publishedData);
  } catch (error) {
    console.error('Unexpected error in on-sale products endpoint:', error);
    next(error);
  }
});

// Get new products (published within 14 days)
router.get('/new/products', async (req, res, next) => {
  try {
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('publish_status', true)
      .gte('inserted_at', fourteenDaysAgo.toISOString())
      .order('inserted_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    next(error);
  }
});

// Get all sales (for admin view)
router.get('/all', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('sale')
      .select(`
        *,
        products!inner(*)
      `)
      .order('start_date', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    next(error);
  }
});

// Create a new sale
router.post('/create', async (req, res, next) => {
  try {
    const { product_id, percentage, fixed_amount, start_date, end_date } = req.body;

    if (!product_id) {
      return res.status(400).json({ 
        success: false,
        error: "Product ID is required" 
      });
    }

    if (!percentage && !fixed_amount) {
      return res.status(400).json({ 
        success: false,
        error: "Either percentage or fixed_amount is required" 
      });
    }

    // Check if product_id is a UUID (database ID) or Shopify product_id
    const trimmedProductId = product_id.trim();
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmedProductId);
    
    let product;
    let productFetchError;

    if (isUUID) {
      // If it's a UUID, look up by database ID directly
      const { data, error } = await supabase
        .from("products")
        .select('id, product_id, product_name')
        .eq("id", trimmedProductId)
        .single();
      product = data;
      productFetchError = error;
    } else {
      // Otherwise, look up by Shopify product_id
      const { data, error } = await supabase
        .from("products")
        .select('id, product_id, product_name')
        .eq("product_id", trimmedProductId)
        .single();
      product = data;
      productFetchError = error;
    }

    // Check if product exists
    if (productFetchError) {
      console.error("❌ [Sales] Product lookup error:", productFetchError);
      return res.status(404).json({ 
        success: false,
        error: "Product not found",
        details: `No product found with ${isUUID ? 'database ID' : 'product_id'}: ${trimmedProductId}`,
        code: productFetchError.code
      });
    }

    if (!product || !product.id) {
      console.error("❌ [Sales] Product not found or missing ID:", { product_id: trimmedProductId, product });
      return res.status(404).json({ 
        success: false,
        error: "Product not found",
        details: `Product lookup returned no data for ${isUUID ? 'database ID' : 'product_id'}: ${trimmedProductId}`
      });
    }

    // Validate that we have a valid database ID (UUID format)
    if (typeof product.id !== 'string' || product.id.length === 0) {
      console.error("❌ [Sales] Invalid product database ID:", product.id);
      return res.status(400).json({ 
        success: false,
        error: "Invalid product database ID",
        details: "Product exists but has an invalid database ID"
      });
    }

    // Verify the product actually exists in the database
    const { count: productCount, error: countError } = await supabase
      .from("products")
      .select('*', { count: 'exact', head: true })
      .eq("id", product.id);

    if (countError) {
      console.error("❌ [Sales] Product count error:", countError);
      return res.status(500).json({
        success: false,
        error: "Database error during verification",
        details: countError.message
      });
    }

    if (productCount === 0 || productCount === null) {
      console.error("❌ [Sales] Product verification failed - product does not exist:", {
        productId: product.id,
        inputProductId: trimmedProductId
      });
      return res.status(404).json({
        success: false,
        error: "Product verification failed",
        details: `Product with ID ${product.id} was found in initial lookup but does not exist in database.`,
      });
    }

    // The foreign key likely references products.product_id (Shopify ID) since that's what
    // the frontend sends and what makes semantic sense for a sale
    // Use the Shopify product_id for the insert
    if (!product.product_id) {
      console.error("❌ [Sales] Product missing Shopify product_id");
      return res.status(400).json({
        success: false,
        error: "Product missing Shopify product_id",
        details: "Product found but does not have a Shopify product_id"
      });
    }
    const finalProductIdForInsert = product.product_id;

    const insertData = {
      product_id: finalProductIdForInsert,
      percentage: percentage || null,
      fixed_amount: fixed_amount || null,
      start_date,
      end_date,
    };

    // 1. Insert into sale using the database ID
    const { data: sale, error: saleError } = await supabase
      .from("sale")
      .insert([insertData])
      .select()
      .single();

    if (saleError) {
      console.error("❌ [Sales] Sale insert error:", saleError);
      
      // Handle foreign key constraint violation specifically
      if (saleError.code === '23503') {
        return res.status(400).json({
          success: false,
          error: "Failed to create sale",
          details: `Product with ID ${product.id} does not exist in the products table. This may indicate a data inconsistency.`,
          code: saleError.code
        });
      }
      
      // Handle other database errors
      return res.status(400).json({
        success: false,
        error: "Failed to create sale",
        details: saleError.message,
        code: saleError.code
      });
    }

    // 2. Update product.on_sale = true
    // Use the database ID for updating (not the Shopify product_id)
    const { data: updatedProduct, error: productError } = await supabase
      .from("products")
      .update({ on_sale: true })
      .eq("id", product.id) // Always use database ID for updates
      .select();

    if (productError) {
      console.error("❌ [Sales] Error updating product on_sale status:", productError);
      // Don't fail the request if this fails, but log it
      // The sale was created successfully
    }

    res.status(201).json({
      success: true,
      sale,
      product: updatedProduct?.[0] || product
    });

  } catch (error) {
    console.error("❌ [Sales] Unexpected error creating sale:", error);
    
    // Handle unexpected errors
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      details: error.message || "An unexpected error occurred while creating the sale"
    });
  }
});


export default router;

