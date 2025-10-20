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
    console.log('🔍 Fetching on-sale products...');
    
    // First, try to get products with active sales
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        sale!inner(*)
      `)
      .eq('on_sale', true)
      .eq('publish_status', true)
      .lte('sale.start_date', new Date().toISOString())
      .gte('sale.end_date', new Date().toISOString());

    if (error) {
      console.error('Error fetching on-sale products with sales:', error);
      
      // Fallback: get products that are marked as on_sale but without date filtering
      console.log('🔄 Trying fallback query...');
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('products')
        .select(`
          *,
          sale(*)
        `)
        .eq('on_sale', true)
        .eq('publish_status', true);

      if (fallbackError) {
        console.error('Error in fallback query:', fallbackError);
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch on-sale products',
          details: fallbackError.message
        });
      }

      console.log('✅ Fallback query successful, found products:', fallbackData?.length || 0);
      return res.json(fallbackData || []);
    }

    console.log('✅ Main query successful, found products:', data?.length || 0);
    // Return empty array if no products on sale (this is normal)
    res.json(data || []);
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

    // 1. Insert into sale
    const { data: sale, error: saleError } = await supabase
      .from("sale")
      .insert([
        {
          product_id,
          percentage: percentage || null,
          fixed_amount: fixed_amount || null,
          start_date,
          end_date,
        },
      ])
      .select()
      .single();

    if (saleError) throw saleError;

    // 2. Update product.on_sale = true
    const { data: updatedProduct, error: productError } = await supabase
    .from("products")
    .update({ on_sale: true })
    .ilike("product_id", product_id.trim())
    .select();

    console.log("Updated product:", updatedProduct, productError);

    if (productError) throw productError;

    res.status(201).json({
      success: true,
      sale,
    });

  } catch (error) {
    console.error("Error creating sale:", error);
    next(error);
  }
});


export default router;

