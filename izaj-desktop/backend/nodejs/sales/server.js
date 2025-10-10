import express from 'express';
import  { supabase } from '../supabaseClient.js';


const router = express.Router();

// Get all published products
router.get('/products', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_published', true);

    if (error) throw error;
    res.json(data);
  } catch (error) {
    next(error);
  }
});

// Get all published products on sale
router.get('/onsale/products', async (req, res, next) => {
  try {
    const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('on_sale', true)
        .eq('is_published', true);
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

