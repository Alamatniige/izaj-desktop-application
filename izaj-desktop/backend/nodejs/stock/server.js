import express from 'express';
import  { supabase } from '../supabaseClient.js';
import { supabase as productSupabase } from '../supabaseProduct.js';
import { logAuditEvent, AuditActions } from '../util/auditLogger.js';
import authenticate from '../util/middlerware.js';

const router = express.Router();

// GET /api/products/stock-summary - Get basic stock summary for admin dashboard
router.get('/stock-summary', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('product_id, product_name')
      .eq('is_published', true);

    // Audit log: record the stock summary fetch
    await logAuditEvent(
      req.user.id,
      AuditActions.VIEW_STOCK_SUMMARY || 'VIEW_STOCK_SUMMARY',
      {
        action: 'Fetched stock summary',
        count: data ? data.length : 0,
        timestamp: new Date().toISOString()
      },
      req
    );

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true, products: data || [] });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// GET /stock-status - Get detailed stock status with sync information
router.get('/stock-status', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select(`
        product_id,
        product_name,
        product_stock(
          current_quantity,
          display_quantity,
          reserved_quantity,
          last_sync_at
        )
      `)
      .eq('is_published', true);

    if (error) {
      console.error('Error fetching stock status:', error);
      
      console.log('Trying fallback method with separate queries...');
      
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('product_id, product_name')
        .eq('is_published', true);

      if (productsError) {
        return res.status(500).json({ error: productsError.message });
      }

      const { data: stocks, error: stocksError } = await supabase
        .from('product_stock')
        .select('product_id, current_quantity, display_quantity, reserved_quantity, last_sync_at');

      if (stocksError) {
        return res.status(500).json({ error: stocksError.message });
      }

      const stockMap = {};
      stocks.forEach(stock => {
        stockMap[stock.product_id] = stock;
      });

      const combinedData = products.map(product => ({
        product_id: product.product_id,
        product_name: product.product_name,
        product_stock: stockMap[product.product_id] ? [stockMap[product.product_id]] : []
      }));

      const stockStatus = combinedData.map(product => {
        const stock = product.product_stock || {};
        const currentQty = stock.current_quantity || 0;
        const displayQty = stock.display_quantity || 0;

        return {
          product_id: product.product_id,
          product_name: product.product_name,
          current_quantity: currentQty,
          display_quantity: displayQty,
          reserved_quantity: stock.reserved_quantity || 0,
          needs_sync: currentQty !== displayQty,
          last_sync_at: stock.last_sync_at,
          difference: currentQty - displayQty,
          has_stock_entry: !!stock.product_id
        };
      });

      await logAuditEvent(req.user.id, 'VIEW_STOCK_STATUS', {
        action: 'Fetched stock status (fallback method)',
        count: stockStatus.length,
        needsSync: stockStatus.filter(p => p.needs_sync).length
      }, req);

      return res.json({
        success: true,
        products: stockStatus,
        summary: {
          total: stockStatus.length,
          needsSync: stockStatus.filter(p => p.needs_sync).length,
          withoutStock: stockStatus.filter(p => !p.has_stock_entry).length
        }
      });
    }

    const stockStatus = data.map(product => {
      const stock = product.product_stock || {};
      const currentQty = stock.current_quantity || 0;
      const displayQty = stock.display_quantity || 0;

      return {
        product_id: product.product_id,
        product_name: product.product_name,
        current_quantity: currentQty,
        display_quantity: displayQty,
        reserved_quantity: stock.reserved_quantity || 0,
        needs_sync: currentQty !== displayQty,
        last_sync_at: stock.last_sync_at,
        difference: currentQty - displayQty,
        has_stock_entry: !!stock.current_quantity || !!stock.display_quantity
      };
    });


    await logAuditEvent(req.user.id, 'VIEW_STOCK_STATUS', {
      action: 'Fetched stock status',
      count: stockStatus.length,
      needsSync: stockStatus.filter(p => p.needs_sync).length
    }, req);

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

// POST /initialize-stock - Create initial stock entries for products without stock records
router.post('/initialize-stock', authenticate, async (req, res) => {
  try {
    // Get products without stock entries
    const { data: productsWithoutStock, error: fetchError } = await supabase
      .from('products')
      .select('product_id')
      .eq('is_published', true)
      .not('product_id', 'in', `(SELECT product_id FROM product_stock)`);

    if (fetchError) {
      return res.status(500).json({ error: fetchError.message });
    }

    if (!productsWithoutStock || productsWithoutStock.length === 0) {
      return res.json({
        success: true,
        message: 'All products already have stock entries',
        initialized: 0
      });
    }

    // Fetch initial quantities from centralized_product
    const productIds = productsWithoutStock.map(p => p.product_id);
    const { data: centralProducts, error: centralError } = await productSupabase
      .from('centralized_product')
      .select('id, quantity')
      .in('id', productIds);

    if (centralError) {
      return res.status(500).json({ error: centralError.message });
    }

    // Map product_id to quantity
    const quantityMap = {};
    for (const cp of centralProducts || []) {
      quantityMap[cp.id] = cp.quantity || 0;
    }

    const now = new Date().toISOString();
    const stockEntries = productsWithoutStock.map(product => ({
      product_id: product.product_id,
      current_quantity: quantityMap[product.product_id] || 0,
      display_quantity: quantityMap[product.product_id] || 0,
      reserved_quantity: 0,
      last_sync_at: now,
      updated_at: now
    }));

    const { data: insertedStock, error: insertError } = await supabase
      .from('product_stock')
      .insert(stockEntries)
      .select();

    if (insertError) {
      return res.status(500).json({ error: insertError.message });
    }

    await logAuditEvent(req.user.id, 'INITIALIZE_STOCK', {
      action: 'Initialized stock entries',
      count: insertedStock.length
    }, req);

    res.json({
      success: true,
      message: `Initialized stock for ${insertedStock.length} products`,
      initialized: insertedStock.length
    });

  } catch (err) {
    console.error('Error initializing stock:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /sync-stock - Manually sync stock quantities for selected products
router.post('/sync-stock', authenticate, async (req, res) => {
  try {
    const { productIds } = req.body;

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ error: 'Product IDs array is required' });
    }

    const { data: stocks, error: fetchError } = await supabase
      .from('product_stock')
      .select('product_id, current_quantity')
      .in('product_id', productIds);

    if (fetchError) {
      return res.status(500).json({ error: fetchError.message });
    }

    const syncResults = [];
    const timestamp = new Date().toISOString();

    for (const stock of stocks) {
      const { data: updatedStock, error: upsertError } = await supabase
        .from('product_stock')
        .upsert({
          product_id: stock.product_id,
          current_quantity: stock.current_quantity,
          display_quantity: stock.current_quantity,
          last_sync_at: timestamp,
          updated_at: timestamp
        }, {
          onConflict: 'product_id'
        })
        .select()
        .single();

      if (upsertError) {
        syncResults.push({
          product_id: stock.product_id,
          success: false,
          error: upsertError.message
        });
      } else {
        syncResults.push({
          product_id: stock.product_id,
          success: true,
          synced_quantity: stock.current_quantity
        });
      }
    }

    const successCount = syncResults.filter(r => r.success).length;
    const failCount = syncResults.filter(r => !r.success).length;

    await logAuditEvent(req.user.id, 'SYNC_STOCK', {
      action: 'Manual stock sync',
      productIds,
      successCount,
      failCount,
      results: syncResults
    }, req);

    res.json({
      success: true,
      message: `Synced ${successCount} products${failCount > 0 ? `, ${failCount} failed` : ''}`,
      results: syncResults,
      summary: { successCount, failCount }
    });

  } catch (err) {
    console.error('Error syncing stock:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /product-status - Get publish status of all published products
router.get('/product-status', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('publish_status')
      .eq('is_published', true);

    if (error) {
      console.error('Error fetching product status:', error);
      console.log('Error details:', error.details);
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

export default router;