import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { emailService } from '../util/emailService.js';

// Create fresh supabase client for this route (same as Settings)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

// Use same Supabase client configuration as Settings
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

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
      console.error('❌ [OnSale Products] Error fetching on-sale products:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch on-sale products',
        details: error.message
      });
    }
    
    // Filter for published products
    const publishedData = data?.filter(p => p.publish_status === true) || [];
    
    // Filter out products with expired sales
    const now = new Date();
    const activeSaleProducts = publishedData.filter(product => {
      // If product has no sales, exclude it
      if (!product.sale || product.sale.length === 0) {
        return false;
      }
      
      // Check if at least one sale is currently active
      const hasActiveSale = product.sale.some(sale => {
        if (!sale.start_date || !sale.end_date) {
          return false; // Invalid sale data
        }
        
        const startDate = new Date(sale.start_date);
        const endDate = new Date(sale.end_date);
        
        // Sale is active if current date is between start and end date (inclusive)
        return now >= startDate && now <= endDate;
      });
      
      return hasActiveSale;
    });
    
    // Log filtered products for debugging
    const expiredCount = publishedData.length - activeSaleProducts.length;
    if (expiredCount > 0) {
      console.log(`✅ [OnSale Products] Filtered out ${expiredCount} product(s) with expired sales`);
    }
    
    // Log sale counts for each product to help debug
    const productSaleCounts = activeSaleProducts.map(p => ({
      product_id: p.product_id,
      product_name: p.product_name,
      on_sale: p.on_sale,
      sale_count: p.sale?.length || 0,
      sale_ids: p.sale?.map(s => s.id) || []
    }));
    
    // Check for products with on_sale = true but no active sales
    const productsWithoutSales = activeSaleProducts.filter(p => (!p.sale || p.sale.length === 0));
    if (productsWithoutSales.length > 0) {
      console.warn(`⚠️ [OnSale Products] Found ${productsWithoutSales.length} products with on_sale = true but no active sales:`, 
        productsWithoutSales.map(p => ({ product_id: p.product_id, product_name: p.product_name }))
      );
    }
    
    res.json(activeSaleProducts);
  } catch (error) {
    console.error('❌ [OnSale Products] Unexpected error:', error);
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

    // Send notification to subscribers about new sale
    const timestamp = new Date().toISOString();
    console.log('\n========================================');
    console.log(`🔥 [${timestamp}] SALE CREATION NOTIFICATION`);
    console.log(`========================================`);
    console.log(`Product ID: ${product.id}`);
    console.log(`Product Name: ${product.product_name}`);
    console.log(`Discount: ${percentage ? `${percentage}% OFF` : fixed_amount ? `₱${fixed_amount} OFF` : 'Special Discount'}`);
    console.log(`Sale Period: ${start_date ? new Date(start_date).toLocaleDateString() : 'Now'} - ${end_date ? new Date(end_date).toLocaleDateString() : 'Limited Time'}`);
    console.log('Checking subscribers...\n');
    
    try {
      // First, let's check ALL subscribers to see what's in the table (using notification client)
      const { data: allSubscribers, error: allError } = await supabase
        .from('newsletter_subscribers')
        .select('email, is_active, id')
        .limit(10);
      
      if (allError) {
        console.error('❌ [Debug] Error fetching all subscribers:', allError);
      } else {
        if (allSubscribers && allSubscribers.length > 0) {
          allSubscribers.forEach((sub, idx) => {
            console.log(`   ${idx + 1}. Email: ${sub.email}, is_active: ${sub.is_active}, id: ${sub.id}`);
          });
        }
      }
      console.log('');
      
      // Get all active subscribers (using same client and query as Settings)
      const { data: subscribers, error: subscribersError } = await supabase
        .from('newsletter_subscribers')
        .select('email, is_active, id', { count: 'exact' })
        .eq('is_active', true);
      
      if (subscribersError) {
        console.error('❌ [Notification] ERROR fetching active subscribers:', subscribersError);
        console.error('Error details:', JSON.stringify(subscribersError, null, 2));
      } else if (!subscribers || subscribers.length === 0) {
        if (allSubscribers && allSubscribers.length > 0) {
          const activeCount = allSubscribers.filter(s => s.is_active === true).length;
          const inactiveCount = allSubscribers.filter(s => s.is_active === false || s.is_active === null).length;
        }
      } else {
        
        const webAppUrl = process.env.WEB_APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://izaj-lighting-centre.netlify.app';
        const productName = product.product_name || 'Product';
        const discountText = percentage 
          ? `${percentage}% OFF` 
          : fixed_amount 
            ? `₱${fixed_amount} OFF` 
            : 'Special Discount';
        
        // Format dates
        const startDate = start_date ? new Date(start_date).toLocaleDateString() : 'Now';
        const endDate = end_date ? new Date(end_date).toLocaleDateString() : 'Limited Time';
        
        // Get product image if available
        const { data: productData } = await supabase
          .from('products')
          .select('media_urls')
          .eq('id', product.id)
          .single();
        
        const productImageUrl = productData?.media_urls?.[0] || null;
        // Use product_id (Shopify ID) for the URL, not the database UUID
        // The website expects numeric product_id in the URL
        const productId = product.product_id || product.id;
        
        // Create beautiful sale notification template
        const notificationHtml = emailService.createSaleNotificationTemplate(
          productName,
          discountText,
          startDate,
          endDate,
          productImageUrl,
          webAppUrl,
          productId
        );
        
        let successCount = 0;
        let failCount = 0;
        
        // Send emails to all subscribers (async, don't wait)
        Promise.all(
          subscribers.map(async (subscriber) => {
            try {
              const normalizedEmail = subscriber.email.toLowerCase().trim();
              await emailService.sendEmail({
                to: normalizedEmail,
                subject: `🔥 Special Sale: ${discountText} on ${productName} - IZAJ Lighting Centre`,
                html: notificationHtml,
                text: `Special Sale: ${productName}\nDiscount: ${discountText}\nSale Period: ${startDate} - ${endDate}\n\nVisit our website: ${webAppUrl}`
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
      console.error('❌ [Notification] EXCEPTION in sale notification process:', notificationError);
      console.error('Error stack:', notificationError.stack);
      console.log('========================================\n');
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

// Delete a sale
router.delete('/:id', async (req, res, next) => {
  console.log('\n========================================');
  console.log('🔵 [ENDPOINT HIT] DELETE /sales/:id');
  console.log('========================================');
  console.log('Sale ID (params):', req.params.id);
  console.log('Sale ID type:', typeof req.params.id);
  console.log('Request method:', req.method);
  console.log('Request URL:', req.originalUrl);
  console.log('Request path:', req.path);
  
  try {
    const saleId = req.params.id;

    if (!saleId) {
      console.error('❌ [Delete Sale] Sale ID is missing');
      return res.status(400).json({
        success: false,
        error: "Sale ID is required"
      });
    }

    console.log('✅ [Delete Sale] Sale ID received:', saleId);

    // Convert saleId to number if it's a string (since sale.id is a number in DB)
    const saleIdNum = isNaN(Number(saleId)) ? saleId : Number(saleId);
    console.log('✅ [Delete Sale] Converted Sale ID:', saleIdNum, 'Type:', typeof saleIdNum);

    // First, get the sale to find the product_id
    const { data: saleData, error: saleFetchError } = await supabase
      .from('sale')
      .select('id, product_id')
      .eq('id', saleIdNum)
      .single();

    if (saleFetchError || !saleData) {
      console.error('❌ [Sales] Sale not found:', saleFetchError);
      return res.status(404).json({
        success: false,
        error: "Sale not found",
        details: saleFetchError?.message || "Sale with the provided ID does not exist"
      });
    }

    // Delete the sale FIRST
    console.log(`🗑️ [Delete Sale] Deleting sale ID: ${saleIdNum} for product_id: ${saleData.product_id}`);
    const { error: deleteError } = await supabase
      .from('sale')
      .delete()
      .eq('id', saleIdNum);

    if (deleteError) {
      console.error('❌ [Sales] Error deleting sale:', deleteError);
      return res.status(500).json({
        success: false,
        error: "Failed to delete sale",
        details: deleteError.message
      });
    }
    
    console.log(`✅ [Delete Sale] Sale deleted successfully from database`);

    // Check if there are any other sales for this product AFTER deletion
    console.log(`🔍 [Delete Sale] Checking for remaining sales for product_id: ${saleData.product_id} (after deletion)`);
    const { data: remainingSales, error: checkError } = await supabase
      .from('sale')
      .select('id, product_id')
      .eq('product_id', saleData.product_id);

    if (checkError) {
      console.error('❌ [Sales] Error checking remaining sales:', checkError);
      // Don't fail the request, just log it
    } else {
      console.log(`📊 [Delete Sale] Remaining sales count: ${remainingSales?.length || 0}`);
      if (remainingSales && remainingSales.length > 0) {
        console.log(`📋 [Delete Sale] Remaining sale IDs:`, remainingSales.map(s => s.id));
      }
    }

    // Find the product by product_id (Shopify ID) - this is what's stored in sale table
    const productIdToSearch = String(saleData.product_id); // Convert to string for comparison
    console.log(`🔍 [Delete Sale] Looking for product with Shopify product_id: ${productIdToSearch} (original type: ${typeof saleData.product_id})`);
    
    // First try to find by Shopify product_id (most common case)
    // Try both string and number comparison since product_id might be stored as text or number
    let { data: product, error: productError } = await supabase
      .from('products')
      .select('id, product_id, product_name, on_sale')
      .eq('product_id', productIdToSearch)
      .limit(1)
      .maybeSingle();
    
    // If not found as string, try as number
    if ((productError || !product) && !isNaN(Number(productIdToSearch))) {
      console.log(`🔍 [Delete Sale] Not found as string, trying as number: ${Number(productIdToSearch)}`);
      const { data: productAsNum, error: productNumError } = await supabase
        .from('products')
        .select('id, product_id, product_name, on_sale')
        .eq('product_id', Number(productIdToSearch))
        .limit(1)
        .maybeSingle();
      
      if (!productNumError && productAsNum) {
        product = productAsNum;
        productError = null;
        console.log(`✅ [Delete Sale] Found product as number`);
      }
    }

    // If not found, try by database id (in case product_id in sale table is actually the DB id)
    if (productError || !product) {
      console.log(`🔍 [Delete Sale] Not found by Shopify product_id, trying by database id: ${saleData.product_id}`);
      const { data: productById, error: productByIdError } = await supabase
        .from('products')
        .select('id, product_id, product_name, on_sale')
        .eq('id', saleData.product_id)
        .limit(1)
        .maybeSingle();
      
      if (!productByIdError && productById) {
        product = productById;
        productError = null;
        console.log(`✅ [Delete Sale] Found product by database id`);
      } else {
        console.log(`⚠️ [Delete Sale] Product not found by database id either`);
        if (productByIdError) {
          console.error(`❌ [Delete Sale] Error:`, productByIdError);
        }
      }
    } else {
      console.log(`✅ [Delete Sale] Found product by Shopify product_id`);
    }

    if (!productError && product) {
      // Update product.on_sale based on whether there are remaining sales
      const hasRemainingSales = remainingSales && remainingSales.length > 0;
      const newOnSaleStatus = hasRemainingSales;
      
      console.log(`📊 [Delete Sale] Product found - DB ID: ${product.id}, Shopify ID: ${product.product_id}`);
      console.log(`📊 [Delete Sale] Current product.on_sale status: ${product.on_sale}`);
      console.log(`📊 [Delete Sale] Remaining sales for product: ${remainingSales?.length || 0}`);
      console.log(`📊 [Delete Sale] Setting product on_sale to: ${newOnSaleStatus}`);

      const { data: updatedProduct, error: updateError } = await supabase
        .from('products')
        .update({ on_sale: newOnSaleStatus })
        .eq('id', product.id)
        .select('id, product_id, product_name, on_sale')
        .single();

      if (updateError) {
        console.error('❌ [Sales] Error updating product on_sale status:', updateError);
        // Don't fail the request, just log it
      } else {
        console.log(`✅ [Sales] Updated product on_sale to ${newOnSaleStatus}`);
        console.log(`✅ [Sales] Updated product details:`, {
          id: updatedProduct?.id,
          product_id: updatedProduct?.product_id,
          product_name: updatedProduct?.product_name,
          on_sale: updatedProduct?.on_sale
        });
        console.log(`✅ [Sales] Product will ${newOnSaleStatus ? 'remain' : 'be removed'} from sale view`);
        
        // Verify the update by querying the product again
        const { data: verifyProduct, error: verifyError } = await supabase
          .from('products')
          .select('id, product_id, product_name, on_sale')
          .eq('id', product.id)
          .single();
        
        if (!verifyError && verifyProduct) {
          console.log(`🔍 [Sales] Verification - Product on_sale status in DB: ${verifyProduct.on_sale}`);
          if (verifyProduct.on_sale !== newOnSaleStatus) {
            console.error(`❌ [Sales] WARNING: Product on_sale status mismatch! Expected: ${newOnSaleStatus}, Got: ${verifyProduct.on_sale}`);
          } else {
            console.log(`✅ [Sales] Verification successful - Product on_sale status matches expected value`);
          }
        }
      }
    } else {
      console.warn('⚠️ [Sales] Product not found for product_id:', saleData.product_id);
      console.warn('⚠️ [Sales] Product lookup error:', productError);
      console.warn('⚠️ [Sales] This may happen if the product was already deleted from the products table');
    }

    console.log('✅ [Sales] Sale deleted successfully');
    res.json({
      success: true,
      message: "Sale deleted successfully"
    });

  } catch (error) {
    console.error("❌ [Sales] Unexpected error deleting sale:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      details: error.message || "An unexpected error occurred while deleting the sale"
    });
  }
});


export default router;

