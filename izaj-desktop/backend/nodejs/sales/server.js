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
      return res.status(400).json({ error: "Product ID is required" });
    }

    if (!percentage && !fixed_amount) {
      return res.status(400).json({ error: "Either percentage or fixed_amount is required" });
    }

    // First, get the product's database ID from the Shopify product_id
    const { data: product, error: productFetchError } = await supabase
      .from("products")
      .select('id, product_id, product_name')
      .eq("product_id", product_id.trim())
      .single();

    if (productFetchError || !product) {
      console.error("Product not found:", productFetchError);
      return res.status(404).json({ error: "Product not found" });
    }

    // 1. Insert into sale using the database ID
    const { data: sale, error: saleError } = await supabase
      .from("sale")
      .insert([
        {
          product_id: product.id, // Use the database ID, not Shopify ID
          percentage: percentage || null,
          fixed_amount: fixed_amount || null,
          start_date,
          end_date,
        },
      ])
      .select()
      .single();

    if (saleError) {
      console.error("Sale insert error:", saleError);
      throw saleError;
    }

    // 2. Update product.on_sale = true
    const { data: updatedProduct, error: productError } = await supabase
      .from("products")
      .update({ on_sale: true })
      .eq("id", product.id) // Use database ID for consistency
      .select();

    if (productError) throw productError;

    res.status(201).json({
      success: true,
      sale,
      product: updatedProduct[0]
    });

  } catch (error) {
    console.error("Error creating sale:", error);
    next(error);
  }
});


export default router;

