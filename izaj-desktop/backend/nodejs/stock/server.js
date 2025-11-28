import express from 'express';
import  { supabase } from '../supabaseClient.js';
import { supabase as productSupabase } from '../supabaseProduct.js';
import { logAuditEvent, AuditActions } from '../util/auditLogger.js';
import authenticate from '../util/middlerware.js';

const router = express.Router();

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
    needs_sync: needsSync,
    last_sync_at: stock.last_sync_at,
    inventory_updated_at: inventoryUpdatedAt,
    display_synced_at: displaySyncedAt,
    difference: needsSync ? Math.max(currentQty - effectiveDisplay, 0) : 0,
    has_stock_entry: !!(stock.product_id || stock.current_quantity !== undefined || stock.display_quantity !== undefined)
  };
};

// GET /api/products/stock-summary - Get basic stock summary for admin dashboard
router.get('/stock-summary', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('product_id, product_name')
      .eq('publish_status', true);

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
          last_sync_at,
          inventory_updated_at,
          display_synced_at
        )
      `)
      .eq('publish_status', true);

    if (error) {
      console.error('Error fetching stock status:', error);
      
      console.log('Trying fallback method with separate queries...');
      
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('product_id, product_name')
        .eq('publish_status', true);

      if (productsError) {
        return res.status(500).json({ error: productsError.message });
      }

      const { data: stocks, error: stocksError } = await supabase
        .from('product_stock')
        .select('product_id, current_quantity, display_quantity, reserved_quantity, last_sync_at, inventory_updated_at, display_synced_at');

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
        const rawStock = Array.isArray(product.product_stock)
          ? product.product_stock[0]
          : product.product_stock;
        return buildStockStatusEntry(product, rawStock || {});
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
      let stock = {};
      if (Array.isArray(product.product_stock)) {
        stock = product.product_stock[0] || {};
      } else if (product.product_stock && typeof product.product_stock === 'object') {
        stock = product.product_stock;
      }
      return buildStockStatusEntry(product, stock);
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
      .select('product_id, current_quantity, reserved_quantity, inventory_updated_at')
      .in('product_id', productIds);

    if (fetchError) {
      return res.status(500).json({ error: fetchError.message });
    }

    const syncResults = [];
    const timestamp = new Date().toISOString();

    for (const stock of stocks) {
      const reservedQty = Number(stock.reserved_quantity ?? 0);
      const currentQty = Number(stock.current_quantity ?? 0);
      const calculatedDisplay = Math.max(currentQty - reservedQty, 0);
      const displaySyncedAt = stock.inventory_updated_at || timestamp;
      const { data: updatedStock, error: upsertError } = await supabase
        .from('product_stock')
        .upsert({
          product_id: stock.product_id,
          current_quantity: currentQty,
          display_quantity: calculatedDisplay,
          last_sync_at: timestamp,
          updated_at: timestamp,
          display_synced_at: displaySyncedAt
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
      .eq('publish_status', true);

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

// GET /debug-stock - Debug endpoint to view raw product_stock table data
router.get('/debug-stock', authenticate, async (req, res) => {
  try {
    // Removed verbose log to reduce terminal noise
    
    // Get all product_stock records with product names
    const { data: stockData, error: stockError } = await supabase
      .from('product_stock')
      .select(`
        product_id,
        current_quantity,
        display_quantity,
        reserved_quantity,
        last_sync_at,
        updated_at
      `)
      .order('updated_at', { ascending: false })
      .limit(50);

    if (stockError) {
      console.error('❌ [Debug] Error fetching stock data:', stockError);
      return res.status(500).json({ 
        error: 'Failed to fetch stock data',
        details: stockError.message 
      });
    }

    // Get product names for the stock records
    const productIds = stockData.map(s => s.product_id);
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('product_id, product_name')
      .in('product_id', productIds);

    if (productsError) {
      console.error('❌ [Debug] Error fetching product names:', productsError);
    }

    // Create product name map
    const productNameMap = {};
    (products || []).forEach(p => {
      productNameMap[p.product_id] = p.product_name;
    });

    // Combine stock data with product names
    const enrichedData = stockData.map(stock => ({
      product_id: stock.product_id,
      product_name: productNameMap[stock.product_id] || 'Unknown Product',
      current_quantity: stock.current_quantity,
      display_quantity: stock.display_quantity,
      reserved_quantity: stock.reserved_quantity,
      // Calculate what display should be if formula is correct
      calculated_display: stock.current_quantity - stock.reserved_quantity,
      // Check if values match the formula
      is_correct: (stock.current_quantity - stock.reserved_quantity) === stock.display_quantity,
      last_sync_at: stock.last_sync_at,
      updated_at: stock.updated_at
    }));

    // Removed verbose logs to reduce terminal noise

    return res.status(200).json({ 
      success: true,
      count: enrichedData.length,
      records: enrichedData,
      summary: {
        total_records: enrichedData.length,
        with_reserved: enrichedData.filter(r => r.reserved_quantity > 0).length,
        incorrect_formula: enrichedData.filter(r => !r.is_correct).length
      }
    });

  } catch (err) {
    console.error('❌ [Debug] Unexpected error:', err);
    return res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
});

export default router;