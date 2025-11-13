import { supabase } from '../supabaseClient.js';

/**
 * Update stock quantities when an order is approved
 * Decreases display_quantity and increases reserved_quantity
 * @param {string} orderId - The order ID
 * @returns {Promise<{success: boolean, updated: number, errors: Array}>}
 */
export async function updateStockFromOrder(orderId) {
  try {
    // Removed verbose log to reduce terminal noise

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
      // Removed verbose log to reduce terminal noise
      return {
        success: true,
        updated: 0,
        errors: [],
        message: 'No order items to process'
      };
    }

    // Removed verbose log to reduce terminal noise

    const updateResults = [];
    const errors = [];

    // Process each order item
    for (const item of orderItems) {
      try {
        const productId = String(item.product_id).trim();
        const quantity = parseInt(item.quantity) || 0;

        if (quantity <= 0) {
          // Removed verbose log to reduce terminal noise
          continue;
        }

        // Removed verbose log to reduce terminal noise

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

        // Removed verbose log to reduce terminal noise

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
          // Removed verbose log to reduce terminal noise
        }
      } catch (itemError) {
        console.error(`❌ [StockUpdater] Error processing item:`, itemError);
        errors.push({
          product_id: item.product_id,
          error: itemError.message
        });
      }
    }

    // Removed verbose log to reduce terminal noise

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
 * Calculate expected stock based on all order_items from approved orders
 * Returns the total quantity that should be reserved for each product
 * Formula: reserved_quantity = SUM(order_items.quantity) from approved/in_transit/complete orders
 *          display_quantity = current_quantity - reserved_quantity
 * @returns {Promise<Map<string, number>>}
 */
async function calculateExpectedReservedStock() {
  try {
    // Get all approved, in_transit, and complete orders ONLY
    // These are the orders that should reserve stock
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, status, order_number')
      .in('status', ['approved', 'in_transit', 'complete']);

    if (ordersError) {
      console.error('❌ [StockUpdater] Error fetching orders:', ordersError);
      return new Map();
    }

    if (!orders || orders.length === 0) {
      // Removed verbose log to reduce terminal noise
      return new Map();
    }

    // Removed verbose log to reduce terminal noise
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
      // Removed verbose log to reduce terminal noise
      return new Map();
    }

    // Removed verbose log to reduce terminal noise

    // Calculate total reserved quantity per product
    const reservedMap = new Map();
    
    // Process each order item
    (orderItems || []).forEach(item => {
      const productId = String(item.product_id).trim();
      const quantity = parseInt(item.quantity) || 0;
      
      // Only process valid quantities
      if (quantity > 0 && productId) {
        const current = reservedMap.get(productId) || 0;
        const newTotal = current + quantity;
        reservedMap.set(productId, newTotal);
      }
    });

    // Removed verbose logs to reduce terminal noise

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
    // Removed verbose log to reduce terminal noise

    // Calculate expected reserved quantities from all approved orders
    const expectedReservedMap = await calculateExpectedReservedStock();
    
    if (expectedReservedMap.size === 0) {
      // Removed verbose log to reduce terminal noise
      return {
        success: true,
        updated: 0,
        errors: [],
        message: 'No approved orders to process'
      };
    }

    // Removed verbose log to reduce terminal noise

    // Get current stock for all products that have orders
    const productIds = Array.from(expectedReservedMap.keys());
    console.log(`📦 [StockUpdater] Syncing stock for ${productIds.length} products with orders`);
    
    const { data: currentStocks, error: fetchError } = await supabase
      .from('product_stock')
      .select('product_id, current_quantity, display_quantity, reserved_quantity')
      .in('product_id', productIds);
    
    if (currentStocks) {
      console.log(`📦 [StockUpdater] Found ${currentStocks.length} stock records`);
      // Log sample for debugging
      if (currentStocks.length > 0) {
        console.log(`📦 [StockUpdater] Sample stock record:`, {
          product_id: currentStocks[0].product_id,
          current_quantity: currentStocks[0].current_quantity,
          display_quantity: currentStocks[0].display_quantity,
          reserved_quantity: currentStocks[0].reserved_quantity
        });
      }
    }

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
        // Normalize productId for lookup (ensure it's a string)
        const normalizedProductId = String(productId).trim();
        const currentStock = stockMap.get(normalizedProductId);
        
        // IMPORTANT: current_quantity is NOT touched - it remains unchanged
        // Only display_quantity and reserved_quantity are updated
        
        // Debug: Log what we found
        if (!currentStock) {
          console.warn(`⚠️ [StockUpdater] Product ${normalizedProductId}: No stock record found in stockMap`);
          // Try allStockMap as fallback
          const allStock = allStockMap.get(normalizedProductId);
          if (allStock) {
            console.log(`✅ [StockUpdater] Found in allStockMap for product ${normalizedProductId}`);
          }
        }
        
        // Get current stock values - handle both existing stock and missing stock
        let currentQuantity = currentStock?.current_quantity;
        const currentDisplayQty = currentStock?.display_quantity ?? 0;
        const currentReservedQty = currentStock?.reserved_quantity ?? 0;
        
        // Debug log the raw values
        console.log(`🔍 [StockUpdater] Product ${normalizedProductId} raw values:`, {
          found_in_stockMap: !!currentStock,
          current_quantity_raw: currentQuantity,
          current_display_raw: currentDisplayQty,
          current_reserved_raw: currentReservedQty,
          expected_reserved: expectedReservedQty
        });

        // If current_quantity doesn't exist, try to get it from the allStockMap (might be in there)
        if ((currentQuantity === null || currentQuantity === undefined) && !currentStock) {
          const allStock = allStockMap.get(normalizedProductId);
          if (allStock) {
            console.log(`🔄 [StockUpdater] Using allStockMap for product ${normalizedProductId}`);
            currentQuantity = allStock.current_quantity;
          }
        }

        // If current_quantity still doesn't exist, we can't calculate display_quantity properly
        // But we can still update reserved_quantity based on orders
        if (currentQuantity === null || currentQuantity === undefined) {
          console.warn(`⚠️ [StockUpdater] Product ${normalizedProductId}: No current_quantity found, can only update reserved_quantity`);
          
          // Update reserved_quantity even if display can't be calculated
          if (currentReservedQty !== expectedReservedQty) {
            const { error: updateError } = await supabase
              .from('product_stock')
              .upsert({
                product_id: normalizedProductId,
                reserved_quantity: expectedReservedQty,
                updated_at: new Date().toISOString()
              }, {
                onConflict: 'product_id'
              });

            if (updateError) {
              console.error(`❌ [StockUpdater] Error updating reserved_quantity for ${normalizedProductId}:`, updateError);
              errors.push({
                product_id: normalizedProductId,
                error: updateError.message
              });
            } else {
              updateResults.push({
                product_id: normalizedProductId,
                reserved_only: true,
                old_reserved: currentReservedQty,
                new_reserved: expectedReservedQty
              });
            }
          }
          continue;
        }

        // Validate current_quantity exists and is a valid number
        if (typeof currentQuantity !== 'number' || isNaN(currentQuantity)) {
          console.error(`❌ [StockUpdater] Product ${normalizedProductId}: Invalid current_quantity: ${currentQuantity} (type: ${typeof currentQuantity})`);
          errors.push({
            product_id: normalizedProductId,
            error: `Invalid current_quantity: ${currentQuantity}. Cannot calculate display_quantity.`
          });
          continue;
        }

        // Ensure we're using numbers for calculation
        const numCurrentQty = Number(currentQuantity);
        const numReservedQty = Number(expectedReservedQty);
        
        // Calculate expected display_quantity based on current_quantity (which we don't touch)
        // Formula: display_quantity = current_quantity - reserved_quantity
        // Where reserved_quantity = EXACT SUM of all order_items.quantity from approved orders ONLY
        const expectedDisplayQty = Math.max(0, numCurrentQty - numReservedQty);

        const needsUpdate = currentDisplayQty !== expectedDisplayQty || currentReservedQty !== numReservedQty;
        
        console.log(`📊 [StockUpdater] Product ${normalizedProductId}:`, {
          current_quantity: numCurrentQty,
          current_display: currentDisplayQty,
          current_reserved: currentReservedQty,
          expected_reserved: numReservedQty,
          expected_display: expectedDisplayQty,
          calculation: `${numCurrentQty} - ${numReservedQty} = ${expectedDisplayQty}`,
          needs_update: needsUpdate
        });

        // Always update to ensure display_quantity is correct (even if values appear the same)
        // Use UPDATE for existing records (more reliable)
        const updateData = {
          display_quantity: expectedDisplayQty, // Calculate: current - reserved
          reserved_quantity: numReservedQty, // From order_items sum (use number)
          updated_at: new Date().toISOString()
        };

        // Always use UPDATE (will fail if record doesn't exist, then we'll handle it)
        console.log(`🔄 [StockUpdater] Updating product ${normalizedProductId}:`, {
          update_data: updateData,
          reason: needsUpdate ? 'values changed' : 'ensuring consistency'
        });
        
        const { data: updatedStock, error: updateError } = await supabase
          .from('product_stock')
          .update(updateData)
          .eq('product_id', normalizedProductId)
          .select()
          .single();

        // Log update result immediately
        if (updateError) {
          console.error(`❌ [StockUpdater] Update failed for ${normalizedProductId}:`, {
            error_code: updateError.code,
            error_message: updateError.message,
            update_data: updateData
          });
        } else {
          console.log(`✅ [StockUpdater] Update successful for ${normalizedProductId}:`, {
            updated_record: updatedStock,
            update_data: updateData
          });
        }

        // If update failed because record doesn't exist, create it
        if (updateError && updateError.code === 'PGRST116') {
          console.log(`➕ [StockUpdater] Record doesn't exist, creating for product ${normalizedProductId}`);
          const upsertData = {
            product_id: normalizedProductId,
            current_quantity: numCurrentQty,
            ...updateData
          };

          const { data: createdStock, error: createError } = await supabase
            .from('product_stock')
            .upsert(upsertData, {
              onConflict: 'product_id'
            })
            .select()
            .single();
          
          if (createError) {
            console.error(`❌ [StockUpdater] Error creating stock record for ${normalizedProductId}:`, createError);
            errors.push({
              product_id: normalizedProductId,
              error: createError.message
            });
            continue;
          } else {
            console.log(`✅ [StockUpdater] Created stock record for product ${normalizedProductId}`);
            // Continue to verification below
            const { data: verifyStock } = await supabase
              .from('product_stock')
              .select('display_quantity, reserved_quantity, current_quantity')
              .eq('product_id', normalizedProductId)
              .single();
            
            if (verifyStock) {
              const isCorrect = verifyStock.display_quantity === expectedDisplayQty && 
                verifyStock.reserved_quantity === numReservedQty;
              
              console.log(`✅ [StockUpdater] Product ${normalizedProductId} created and verified:`, {
                expected: { display: expectedDisplayQty, reserved: numReservedQty },
                actual: { 
                  display: verifyStock.display_quantity, 
                  reserved: verifyStock.reserved_quantity,
                  current: verifyStock.current_quantity
                },
                matches: isCorrect
              });
            }
            
            updateResults.push({
              product_id: normalizedProductId,
              current_quantity: numCurrentQty,
              expected_display: expectedDisplayQty,
              expected_reserved: numReservedQty,
              old_display: currentDisplayQty,
              old_reserved: currentReservedQty,
              calculation: `${numCurrentQty} - ${numReservedQty} = ${expectedDisplayQty}`,
              action: 'created'
            });
            continue;
          }
        }

        if (updateError) {
          console.error(`❌ [StockUpdater] Error updating stock for ${normalizedProductId}:`, updateError);
          console.error(`❌ [StockUpdater] Error details:`, {
            code: updateError.code,
            message: updateError.message,
            details: updateError.details,
            hint: updateError.hint
          });
          errors.push({
            product_id: normalizedProductId,
            error: updateError.message
          });
        } else {
          // Immediately verify the update was correct
          const { data: verifyStock, error: verifyError } = await supabase
            .from('product_stock')
            .select('display_quantity, reserved_quantity, current_quantity')
            .eq('product_id', normalizedProductId)
            .single();
          
          if (verifyError) {
            console.error(`❌ [StockUpdater] Error verifying update for ${normalizedProductId}:`, verifyError);
          } else {
            const isCorrect = verifyStock && 
              verifyStock.display_quantity === expectedDisplayQty && 
              verifyStock.reserved_quantity === numReservedQty;

            console.log(`✅ [StockUpdater] Product ${normalizedProductId} update result:`, {
              success: !updateError,
              expected: { display: expectedDisplayQty, reserved: numReservedQty },
              actual: verifyStock ? { 
                display: verifyStock.display_quantity, 
                reserved: verifyStock.reserved_quantity,
                current: verifyStock.current_quantity
              } : 'null',
              matches: isCorrect
            });

            if (!isCorrect) {
              console.warn(`⚠️ [StockUpdater] Product ${normalizedProductId}: Update verification failed!`, {
                expected: { display: expectedDisplayQty, reserved: numReservedQty },
                actual: verifyStock ? { display: verifyStock.display_quantity, reserved: verifyStock.reserved_quantity } : 'null'
              });
            }
          }

          updateResults.push({
            product_id: normalizedProductId,
            current_quantity: numCurrentQty,
            expected_display: expectedDisplayQty,
            expected_reserved: numReservedQty,
            old_display: currentDisplayQty,
            old_reserved: currentReservedQty,
            calculation: `${numCurrentQty} - ${numReservedQty} = ${expectedDisplayQty}`,
            updated: updatedStock,
            verified: verifyStock
          });
        }
        // Removed verbose log to reduce terminal noise
      } catch (itemError) {
        console.error(`❌ [StockUpdater] Error processing product ${normalizedProductId}:`, itemError);
        console.error(`❌ [StockUpdater] Error stack:`, itemError.stack);
        errors.push({
          product_id: normalizedProductId,
          error: itemError.message
        });
      }
    }

    // Also handle products that might have reserved_quantity but no orders
    // Reset their reserved_quantity if they're not in the expected map
    if (allStockMap && allStockMap.size > 0) {
      for (const [productId, stock] of allStockMap.entries()) {
        if (!expectedReservedMap.has(productId)) {
          // This product has no orders, so reserved_quantity should be 0
          const currentQuantity = stock.current_quantity;
          
          // Only update if current_quantity exists
          if (currentQuantity !== null && currentQuantity !== undefined) {
            const expectedDisplayQty = currentQuantity; // All stock should be available (no reserved)
            const currentReservedQty = stock.reserved_quantity || 0;
            const currentDisplayQty = stock.display_quantity || 0;

            // Always update to ensure values are correct
            if (currentDisplayQty !== expectedDisplayQty || currentReservedQty !== 0) {
              console.log(`🔄 [StockUpdater] Resetting product ${productId}: reserved=0, display=${expectedDisplayQty}`);
              
              // Use upsert to ensure the record exists
              const { error: updateError } = await supabase
                .from('product_stock')
                .upsert({
                  product_id: productId,
                  current_quantity: currentQuantity,
                  display_quantity: expectedDisplayQty,
                  reserved_quantity: 0,
                  updated_at: new Date().toISOString()
                }, {
                  onConflict: 'product_id'
                });

              if (updateError) {
                console.error(`❌ [StockUpdater] Error resetting stock for ${productId}:`, updateError);
                errors.push({
                  product_id: productId,
                  error: updateError.message
                });
              } else {
                updateResults.push({
                  product_id: productId,
                  action: 'reset',
                  old_reserved: currentReservedQty,
                  new_reserved: 0,
                  old_display: currentDisplayQty,
                  new_display: expectedDisplayQty
                });
              }
            }
          }
        }
      }
    }

    // Removed verbose log to reduce terminal noise

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
    // Removed verbose log to reduce terminal noise

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
      // Removed verbose log to reduce terminal noise
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

        // Removed verbose log to reduce terminal noise

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

    // Removed verbose log to reduce terminal noise

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

