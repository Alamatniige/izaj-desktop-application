import { supabase } from '../supabaseClient.js';

/**
 * Update stock quantities when an order is approved
 * Decreases display_quantity and increases reserved_quantity
 * @param {string} orderId - The order ID
 * @returns {Promise<{success: boolean, updated: number, errors: Array}>}
 */
export async function updateStockFromOrder(orderId) {
  try {
    console.log(`📦 [StockUpdater] Processing stock update for order: ${orderId}`);

    // Get order items
    const { data: orderItems, error: itemsError } = await supabase
      .from('order_items')
      .select('product_id, quantity')
      .eq('order_id', orderId);

    if (itemsError) {
      console.error('❌ [StockUpdater] Error fetching order items:', itemsError);
      return {
        success: false,
        error: `Failed to fetch order items: ${itemsError.message}`,
        updated: 0,
        errors: []
      };
    }

    if (!orderItems || orderItems.length === 0) {
      console.log('⚠️ [StockUpdater] No order items found for this order');
      return {
        success: true,
        updated: 0,
        errors: [],
        message: 'No order items to process'
      };
    }

    console.log(`📦 [StockUpdater] Found ${orderItems.length} order items`);

    const updateResults = [];
    const errors = [];

    // Process each order item
    for (const item of orderItems) {
      try {
        const productId = String(item.product_id).trim();
        const quantity = parseInt(item.quantity) || 0;

        if (quantity <= 0) {
          console.log(`⚠️ [StockUpdater] Skipping item with invalid quantity: ${productId}`);
          continue;
        }

        console.log(`📦 [StockUpdater] Processing product ${productId}, quantity: ${quantity}`);

        // Get current stock
        const { data: currentStock, error: fetchError } = await supabase
          .from('product_stock')
          .select('display_quantity, reserved_quantity')
          .eq('product_id', productId)
          .single();

        if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = not found
          console.error(`❌ [StockUpdater] Error fetching stock for ${productId}:`, fetchError);
          errors.push({
            product_id: productId,
            error: fetchError.message
          });
          continue;
        }

        const currentDisplayQty = currentStock?.display_quantity || 0;
        const currentReservedQty = currentStock?.reserved_quantity || 0;

        // Calculate new quantities
        const newDisplayQty = Math.max(0, currentDisplayQty - quantity);
        const newReservedQty = (currentReservedQty || 0) + quantity;

        console.log(`📦 [StockUpdater] Product ${productId}: ${currentDisplayQty} → ${newDisplayQty} (display), ${currentReservedQty} → ${newReservedQty} (reserved)`);

        // Update stock
        const { data: updatedStock, error: updateError } = await supabase
          .from('product_stock')
          .upsert({
            product_id: productId,
            display_quantity: newDisplayQty,
            reserved_quantity: newReservedQty,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'product_id'
          })
          .select()
          .single();

        if (updateError) {
          console.error(`❌ [StockUpdater] Error updating stock for ${productId}:`, updateError);
          errors.push({
            product_id: productId,
            error: updateError.message
          });
        } else {
          updateResults.push({
            product_id: productId,
            quantity: quantity,
            old_display: currentDisplayQty,
            new_display: newDisplayQty,
            old_reserved: currentReservedQty,
            new_reserved: newReservedQty
          });
          console.log(`✅ [StockUpdater] Successfully updated stock for product ${productId}`);
        }
      } catch (itemError) {
        console.error(`❌ [StockUpdater] Error processing item:`, itemError);
        errors.push({
          product_id: item.product_id,
          error: itemError.message
        });
      }
    }

    console.log(`✅ [StockUpdater] Completed: ${updateResults.length} updated, ${errors.length} errors`);

    return {
      success: errors.length === 0,
      updated: updateResults.length,
      errors: errors,
      results: updateResults
    };
  } catch (error) {
    console.error('❌ [StockUpdater] Unexpected error:', error);
    return {
      success: false,
      error: error.message,
      updated: 0,
      errors: [{ error: error.message }]
    };
  }
}

/**
 * Calculate expected stock based on all approved orders
 * Returns the total quantity that should be reserved for each product
 * @returns {Promise<Map<string, number>>}
 */
async function calculateExpectedReservedStock() {
  try {
    console.log('🔍 [StockUpdater] Calculating expected reserved stock from order_items...');
    
    // Get all approved, in_transit, and complete orders ONLY
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, status, order_number')
      .in('status', ['approved', 'in_transit', 'complete']);

    if (ordersError) {
      console.error('❌ [StockUpdater] Error fetching orders:', ordersError);
      return new Map();
    }

    if (!orders || orders.length === 0) {
      console.log('⚠️ [StockUpdater] No approved/in_transit/complete orders found');
      return new Map();
    }

    console.log(`📦 [StockUpdater] Found ${orders.length} approved/in_transit/complete orders`);
    const orderIds = orders.map(o => o.id);

    // Get ALL order items for these specific orders
    const { data: orderItems, error: itemsError } = await supabase
      .from('order_items')
      .select('product_id, quantity, order_id')
      .in('order_id', orderIds);

    if (itemsError) {
      console.error('❌ [StockUpdater] Error fetching order items:', itemsError);
      return new Map();
    }

    if (!orderItems || orderItems.length === 0) {
      console.log('⚠️ [StockUpdater] No order items found for approved orders');
      return new Map();
    }

    console.log(`📦 [StockUpdater] Found ${orderItems.length} order items`);

    // Calculate total reserved quantity per product
    const reservedMap = new Map();
    const itemDetails = new Map(); // Track details for logging
    
    // Process each order item
    (orderItems || []).forEach(item => {
      const productId = String(item.product_id).trim();
      const quantity = parseInt(item.quantity) || 0;
      const orderId = item.order_id;
      
      // Only process valid quantities
      if (quantity > 0 && productId) {
        const current = reservedMap.get(productId) || 0;
        const newTotal = current + quantity;
        reservedMap.set(productId, newTotal);
        
        // Track details for debugging
        if (!itemDetails.has(productId)) {
          itemDetails.set(productId, []);
        }
        itemDetails.get(productId).push({
          order_id: orderId,
          quantity: quantity
        });
      } else {
        console.warn(`⚠️ [StockUpdater] Skipping invalid order item: product_id=${productId}, quantity=${quantity}`);
      }
    });

    // Log detailed calculation for each product
    console.log(`\n📊 [StockUpdater] Reserved quantity calculation from order_items:`);
    console.log(`   Total products with orders: ${reservedMap.size}`);
    
    for (const [productId, total] of reservedMap.entries()) {
      const details = itemDetails.get(productId) || [];
      const quantities = details.map(d => `${d.quantity} (order: ${d.order_id})`);
      const sumCheck = details.reduce((sum, d) => sum + d.quantity, 0);
      
      console.log(`\n   📦 Product ${productId}:`);
      console.log(`      Order items: ${details.length}`);
      details.forEach((d, idx) => {
        console.log(`         ${idx + 1}. Order ${d.order_id}: quantity = ${d.quantity}`);
      });
      console.log(`      SUM: ${details.map(d => d.quantity).join(' + ')} = ${total}`);
      console.log(`      Verification: ${sumCheck === total ? '✅' : '❌'} (calculated: ${sumCheck}, stored: ${total})`);
    }

    return reservedMap;
  } catch (error) {
    console.error('❌ [StockUpdater] Error calculating expected reserved stock:', error);
    return new Map();
  }
}

/**
 * Sync stock based on all approved orders - calculates expected values and updates to match
 * This is idempotent - safe to run multiple times
 * @returns {Promise<{success: boolean, updated: number, errors: Array}>}
 */
export async function syncStockFromAllOrders() {
  try {
    console.log('🔄 [StockUpdater] Syncing stock based on all approved orders...');

    // Calculate expected reserved quantities from all approved orders
    const expectedReservedMap = await calculateExpectedReservedStock();
    
    if (expectedReservedMap.size === 0) {
      console.log('⚠️ [StockUpdater] No approved orders found');
      return {
        success: true,
        updated: 0,
        errors: [],
        message: 'No approved orders to process'
      };
    }

    console.log(`📦 [StockUpdater] Found ${expectedReservedMap.size} products with orders`);

    // Get current stock for all products that have orders
    const productIds = Array.from(expectedReservedMap.keys());
    const { data: currentStocks, error: fetchError } = await supabase
      .from('product_stock')
      .select('product_id, current_quantity, display_quantity, reserved_quantity')
      .in('product_id', productIds);

    // Also get all products (even without stock entries) to ensure we have complete data
    const { data: allCurrentStocks } = await supabase
      .from('product_stock')
      .select('product_id, current_quantity, display_quantity, reserved_quantity');
    
    const allStockMap = new Map();
    (allCurrentStocks || []).forEach(stock => {
      allStockMap.set(String(stock.product_id).trim(), stock);
    });

    if (fetchError) {
      console.error('❌ [StockUpdater] Error fetching current stock:', fetchError);
      return {
        success: false,
        error: `Failed to fetch current stock: ${fetchError.message}`,
        updated: 0,
        errors: []
      };
    }

    const stockMap = new Map();
    (currentStocks || []).forEach(stock => {
      stockMap.set(String(stock.product_id).trim(), stock);
    });
    
    // Also check all stocks for products that might not have orders but need reset

    const updateResults = [];
    const errors = [];

    // Process each product
    for (const [productId, expectedReservedQty] of expectedReservedMap.entries()) {
      try {
        const currentStock = stockMap.get(productId);
        
        // IMPORTANT: current_quantity is NOT touched - it remains unchanged
        // Only display_quantity and reserved_quantity are updated
        
        const currentQuantity = currentStock?.current_quantity; // Read only, never modify
        const currentDisplayQty = currentStock?.display_quantity || 0;
        const currentReservedQty = currentStock?.reserved_quantity || 0;

        // If current_quantity doesn't exist, we can't calculate display_quantity properly
        // But we can still update reserved_quantity based on orders
        if (currentQuantity === null || currentQuantity === undefined) {
          console.warn(`⚠️ [StockUpdater] Product ${productId}: No current_quantity found, can only update reserved_quantity`);
          
          // Only update reserved_quantity if it's different
          if (currentReservedQty !== expectedReservedQty) {
            const { error: updateError } = await supabase
              .from('product_stock')
              .upsert({
                product_id: productId,
                reserved_quantity: expectedReservedQty,
                updated_at: new Date().toISOString()
              }, {
                onConflict: 'product_id'
              });

            if (updateError) {
              errors.push({
                product_id: productId,
                error: updateError.message
              });
            } else {
              updateResults.push({
                product_id: productId,
                reserved_only: true,
                old_reserved: currentReservedQty,
                new_reserved: expectedReservedQty
              });
            }
          }
          continue;
        }

        // Calculate expected display_quantity based on current_quantity (which we don't touch)
        // Formula: display_quantity = current_quantity - reserved_quantity
        // Where reserved_quantity = EXACT SUM of all order_items.quantity from approved orders ONLY
        const expectedDisplayQty = Math.max(0, currentQuantity - expectedReservedQty);

        console.log(`\n📦 [StockUpdater] Processing Product: ${productId}`);
        console.log(`   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`   Current Quantity (NOT MODIFIED): ${currentQuantity}`);
        console.log(`   Current Display Quantity: ${currentDisplayQty}`);
        console.log(`   Current Reserved Quantity: ${currentReservedQty}`);
        console.log(`   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`   Expected Reserved (from order_items SUM): ${expectedReservedQty}`);
        console.log(`   Calculation: ${currentQuantity} - ${expectedReservedQty} = ${expectedDisplayQty}`);
        console.log(`   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`   NEW Display Quantity: ${expectedDisplayQty}`);
        console.log(`   NEW Reserved Quantity: ${expectedReservedQty}`);

        // Only update if values are different
        if (currentDisplayQty !== expectedDisplayQty || currentReservedQty !== expectedReservedQty) {
          console.log(`   ✅ Needs update (display and/or reserved)`);

          // Update stock - DO NOT touch current_quantity, only update display and reserved
          // Use update instead of upsert to preserve current_quantity
          const { data: updatedStock, error: updateError } = await supabase
            .from('product_stock')
            .update({
              display_quantity: expectedDisplayQty, // Calculate: current - reserved
              reserved_quantity: expectedReservedQty, // From order_items sum
              updated_at: new Date().toISOString()
            })
            .eq('product_id', productId)
            .select()
            .single();

          // If no record exists, create one (but we shouldn't set current_quantity to 0)
          if (updateError && updateError.code === 'PGRST116') {
            console.warn(`⚠️ [StockUpdater] Product ${productId}: No stock record exists, cannot create without current_quantity`);
            errors.push({
              product_id: productId,
              error: 'Stock record does not exist and cannot be created without current_quantity'
            });
            continue;
          }

          if (updateError) {
            console.error(`❌ [StockUpdater] Error updating stock for ${productId}:`, updateError);
            errors.push({
              product_id: productId,
              error: updateError.message
            });
          } else {
            // Verify the update was correct
            const { data: verifyStock } = await supabase
              .from('product_stock')
              .select('display_quantity, reserved_quantity, current_quantity')
              .eq('product_id', productId)
              .single();
            
            updateResults.push({
              product_id: productId,
              current_quantity: currentQuantity,
              expected_display: expectedDisplayQty,
              expected_reserved: expectedReservedQty,
              old_display: currentDisplayQty,
              old_reserved: currentReservedQty,
              calculation: `${currentQuantity} - ${expectedReservedQty} = ${expectedDisplayQty}`,
              verified: verifyStock ? {
                display_quantity: verifyStock.display_quantity,
                reserved_quantity: verifyStock.reserved_quantity,
                current_quantity: verifyStock.current_quantity,
                matches: verifyStock.display_quantity === expectedDisplayQty && 
                        verifyStock.reserved_quantity === expectedReservedQty &&
                        verifyStock.current_quantity === currentQuantity
              } : null
            });
            
            if (verifyStock) {
              console.log(`   ✅ Updated successfully`);
              console.log(`   🔍 Verification:`);
              console.log(`      Display: ${verifyStock.display_quantity} (expected: ${expectedDisplayQty}) ${verifyStock.display_quantity === expectedDisplayQty ? '✅' : '❌'}`);
              console.log(`      Reserved: ${verifyStock.reserved_quantity} (expected: ${expectedReservedQty}) ${verifyStock.reserved_quantity === expectedReservedQty ? '✅' : '❌'}`);
              console.log(`      Current: ${verifyStock.current_quantity} (unchanged: ${currentQuantity}) ${verifyStock.current_quantity === currentQuantity ? '✅' : '❌'}`);
            } else {
              console.log(`   ✅ Updated (verification pending)`);
            }
          }
        } else {
          console.log(`   ✅ Stock already correct (no update needed)`);
        }
      } catch (itemError) {
        console.error(`❌ [StockUpdater] Error processing product ${productId}:`, itemError);
        errors.push({
          product_id: productId,
          error: itemError.message
        });
      }
    }

    // Also handle products that might have reserved_quantity but no orders
    // Reset their reserved_quantity if they're not in the expected map
    if (allStockMap && allStockMap.size > 0) {
      for (const [productId, stock] of allStockMap.entries()) {
        if (!expectedReservedMap.has(productId) && stock.reserved_quantity > 0) {
          // This product has reserved stock but no orders, reset it
          const currentQuantity = stock.current_quantity;
          
          // Only update if current_quantity exists
          if (currentQuantity !== null && currentQuantity !== undefined) {
            const expectedDisplayQty = currentQuantity; // All stock should be available (no reserved)

            if (stock.display_quantity !== expectedDisplayQty || stock.reserved_quantity !== 0) {
              console.log(`🔄 [StockUpdater] Product ${productId}: Resetting reserved stock (no orders)`);
              
              // Update only display and reserved, DO NOT touch current_quantity
              const { error: updateError } = await supabase
                .from('product_stock')
                .update({
                  display_quantity: expectedDisplayQty,
                  reserved_quantity: 0,
                  updated_at: new Date().toISOString()
                })
                .eq('product_id', productId);

              if (!updateError) {
                updateResults.push({
                  product_id: productId,
                  action: 'reset',
                  old_reserved: stock.reserved_quantity,
                  new_reserved: 0,
                  old_display: stock.display_quantity,
                  new_display: expectedDisplayQty
                });
              }
            }
          }
        }
      }
    }

    console.log(`✅ [StockUpdater] Sync completed: ${updateResults.length} products updated, ${errors.length} errors`);

    return {
      success: errors.length === 0,
      updated: updateResults.length,
      errors: errors,
      results: updateResults
    };
  } catch (error) {
    console.error('❌ [StockUpdater] Unexpected error in sync:', error);
    return {
      success: false,
      error: error.message,
      updated: 0,
      errors: [{ error: error.message }]
    };
  }
}

/**
 * Reverse stock changes when an order is cancelled
 * Increases display_quantity and decreases reserved_quantity
 * @param {string} orderId - The order ID
 * @returns {Promise<{success: boolean, updated: number, errors: Array}>}
 */
export async function reverseStockFromOrder(orderId) {
  try {
    console.log(`🔄 [StockUpdater] Reversing stock for cancelled order: ${orderId}`);

    // Get order items
    const { data: orderItems, error: itemsError } = await supabase
      .from('order_items')
      .select('product_id, quantity')
      .eq('order_id', orderId);

    if (itemsError) {
      console.error('❌ [StockUpdater] Error fetching order items:', itemsError);
      return {
        success: false,
        error: `Failed to fetch order items: ${itemsError.message}`,
        updated: 0,
        errors: []
      };
    }

    if (!orderItems || orderItems.length === 0) {
      console.log('⚠️ [StockUpdater] No order items found for this order');
      return {
        success: true,
        updated: 0,
        errors: [],
        message: 'No order items to reverse'
      };
    }

    const updateResults = [];
    const errors = [];

    // Process each order item
    for (const item of orderItems) {
      try {
        const productId = String(item.product_id).trim();
        const quantity = parseInt(item.quantity) || 0;

        if (quantity <= 0) continue;

        // Get current stock
        const { data: currentStock, error: fetchError } = await supabase
          .from('product_stock')
          .select('display_quantity, reserved_quantity')
          .eq('product_id', productId)
          .single();

        if (fetchError) {
          console.error(`❌ [StockUpdater] Error fetching stock for ${productId}:`, fetchError);
          errors.push({
            product_id: productId,
            error: fetchError.message
          });
          continue;
        }

        const currentDisplayQty = currentStock?.display_quantity || 0;
        const currentReservedQty = currentStock?.reserved_quantity || 0;

        // Calculate new quantities (reverse the order)
        const newDisplayQty = currentDisplayQty + quantity;
        const newReservedQty = Math.max(0, currentReservedQty - quantity);

        console.log(`🔄 [StockUpdater] Product ${productId}: ${currentDisplayQty} → ${newDisplayQty} (display), ${currentReservedQty} → ${newReservedQty} (reserved)`);

        // Update stock
        const { data: updatedStock, error: updateError } = await supabase
          .from('product_stock')
          .upsert({
            product_id: productId,
            display_quantity: newDisplayQty,
            reserved_quantity: newReservedQty,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'product_id'
          })
          .select()
          .single();

        if (updateError) {
          console.error(`❌ [StockUpdater] Error updating stock for ${productId}:`, updateError);
          errors.push({
            product_id: productId,
            error: updateError.message
          });
        } else {
          updateResults.push({
            product_id: productId,
            quantity: quantity,
            old_display: currentDisplayQty,
            new_display: newDisplayQty,
            old_reserved: currentReservedQty,
            new_reserved: newReservedQty
          });
        }
      } catch (itemError) {
        console.error(`❌ [StockUpdater] Error processing item:`, itemError);
        errors.push({
          product_id: item.product_id,
          error: itemError.message
        });
      }
    }

    console.log(`✅ [StockUpdater] Reversal completed: ${updateResults.length} updated, ${errors.length} errors`);

    return {
      success: errors.length === 0,
      updated: updateResults.length,
      errors: errors,
      results: updateResults
    };
  } catch (error) {
    console.error('❌ [StockUpdater] Unexpected error:', error);
    return {
      success: false,
      error: error.message,
      updated: 0,
      errors: [{ error: error.message }]
    };
  }
}

