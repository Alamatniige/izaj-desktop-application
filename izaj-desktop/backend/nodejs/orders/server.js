import express from 'express';
import { supabase } from '../supabaseClient.js';
import authenticate from '../util/middlerware.js';
import { logAuditEvent, AuditActions } from '../util/auditLogger.js';
import { updateStockFromOrder, reverseStockFromOrder, syncStockFromAllOrders } from '../util/stockUpdater.js';
import { getAdminContext } from '../util/adminContext.js';

const router = express.Router();

// GET /api/orders - Get all orders with optional filters
router.get('/orders', authenticate, async (req, res) => {
  try {
    const { status } = req.query;

    // Get admin context to check SuperAdmin status and branches
    const adminContext = await getAdminContext(req.user.id);
    
    // Removed verbose logs to reduce terminal noise

    let query = supabase
      .from('orders')
      .select(`
        *,
        order_items(*)
      `);

    // Filter by branches if not SuperAdmin
    if (!adminContext.isSuperAdmin) {
      if (!adminContext.assignedBranches || adminContext.assignedBranches.length === 0) {
        // No branches assigned - return empty array
        return res.json({
          success: true,
          data: [],
          count: 0
        });
      }
      // Filter by branch OR assigned_admin_id using PostgREST OR syntax
      // Format: (branch.eq.value1,branch.eq.value2),assigned_admin_id.eq.userId
      const branchConditions = adminContext.assignedBranches.map(b => `branch.eq.${encodeURIComponent(b)}`).join(',');
      query = query.or(`(${branchConditions}),assigned_admin_id.eq.${req.user.id}`);
    }

    if (status) {
      query = query.eq('status', status);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('❌ [Orders] Error fetching orders:', error);
      console.error('❌ [Orders] Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch orders',
        details: error.message
      });
    }

    // Removed verbose success log to reduce terminal noise

    // Log audit event
    await logAuditEvent(req.user.id, AuditActions.VIEW_ORDERS, {
      filter: status || 'all',
      count: data?.length || 0,
      isSuperAdmin: adminContext.isSuperAdmin
    }, req);
    
    res.json({
      success: true,
      data: data || [],
      count: data?.length || 0
    });

  } catch (error) {
    console.error('❌ [Orders] Server error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

// GET /api/orders/:id - Get a single order by ID
router.get('/orders/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        items:order_items(*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // Log audit event
    await logAuditEvent(req.user.id, AuditActions.VIEW_ORDER_DETAILS, {
      order_id: id,
      order_number: data.order_number
    }, req);

    res.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('Error getting order:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// PUT /api/orders/:id/status - Update order status
router.put('/orders/:id/status', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, tracking_number, courier, admin_notes } = req.body;

    // Removed verbose log to reduce terminal noise

    // Get admin context to check SuperAdmin status
    const adminContext = await getAdminContext(req.user.id);

    // First, get the current order to log the old status and check access
    const { data: currentOrder, error: fetchError } = await supabase
      .from('orders')
      .select('order_number, status, branch, assigned_admin_id')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('❌ Error fetching current order:', fetchError);
      return res.status(404).json({
        success: false,
        error: 'Order not found',
        details: fetchError.message
      });
    }

    // Validate access if not SuperAdmin
    if (!adminContext.isSuperAdmin) {
      const hasAccess = 
        (currentOrder.branch && adminContext.assignedBranches.includes(currentOrder.branch)) ||
        currentOrder.assigned_admin_id === req.user.id;
      
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          error: 'Access denied. You do not have permission to modify this order.'
        });
      }
    }

    const updateData = { status };
    if (tracking_number) updateData.tracking_number = tracking_number;
    if (courier) updateData.courier = courier;
    if (admin_notes) updateData.admin_notes = admin_notes;
    
    // Set delivered_at timestamp when marking as complete
    if (status === 'complete') {
      updateData.delivered_at = new Date().toISOString();
    }

    // Removed verbose log to reduce terminal noise

    const { data, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('❌ Supabase error:', error);
      console.error('❌ Error code:', error.code);
      console.error('❌ Error details:', error.details);
      console.error('❌ Error hint:', error.hint);
      
      return res.status(500).json({
        success: false,
        error: 'Failed to update order status',
        details: error.message,
        code: error.code,
        hint: error.hint
      });
    }

    // Update stock when order is approved
    if (status === 'approved' && currentOrder.status !== 'approved') {
      try {
        const stockResult = await updateStockFromOrder(id);
        if (!stockResult.success) {
          console.error('⚠️ [Orders] Stock update had errors:', stockResult.errors);
          // Don't fail the request, but log it
        }
        // Removed success log to reduce terminal noise
      } catch (stockError) {
        console.error('⚠️ [Orders] Error updating stock (non-critical):', stockError);
      }
    }

    // Reverse stock when order is cancelled
    if (status === 'cancelled' && currentOrder.status !== 'cancelled' && currentOrder.status === 'approved') {
      try {
        const stockResult = await reverseStockFromOrder(id);
        if (!stockResult.success) {
          console.error('⚠️ [Orders] Stock reversal had errors:', stockResult.errors);
        }
        // Removed success log to reduce terminal noise
      } catch (stockError) {
        console.error('⚠️ [Orders] Error reversing stock (non-critical):', stockError);
      }
    }

    // Log audit event (don't let this fail the request)
    try {
      await logAuditEvent(req.user.id, AuditActions.UPDATE_ORDER_STATUS, {
        order_id: id,
        order_number: currentOrder.order_number,
        old_status: currentOrder.status,
        new_status: status,
        tracking_number,
        courier,
        admin_notes
      }, req);
    } catch (auditError) {
      console.error('⚠️ Audit logging failed (non-critical):', auditError);
    }

    // Removed verbose success log to reduce terminal noise

    res.json({
      success: true,
      message: `Order status updated to ${status}`,
      data
    });

  } catch (error) {
    console.error('❌ Error updating order status:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// PUT /api/orders/:id/cancel - Cancel an order
router.put('/orders/:id/cancel', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    // Get current order status
    const { data: currentOrder } = await supabase
      .from('orders')
      .select('status, order_number')
      .eq('id', id)
      .single();

    const { data, error } = await supabase
      .from('orders')
      .update({
        status: 'cancelled',
        cancellation_reason: reason,
        cancelled_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({
        success: false,
        error: 'Failed to cancel order',
        details: error.message
      });
    }

    // Reverse stock if order was previously approved
    if (currentOrder?.status === 'approved') {
      try {
        const stockResult = await reverseStockFromOrder(id);
        if (!stockResult.success) {
          console.error('⚠️ [Orders] Stock reversal had errors:', stockResult.errors);
        }
        // Removed success log to reduce terminal noise
      } catch (stockError) {
        console.error('⚠️ [Orders] Error reversing stock (non-critical):', stockError);
      }
    }

    // Log audit event
    await logAuditEvent(req.user.id, AuditActions.CANCEL_ORDER, {
      order_id: id,
      order_number: data.order_number,
      cancellation_reason: reason
    }, req);

    res.json({
      success: true,
      message: 'Order cancelled successfully',
      data
    });

  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/orders/process-stock - Sync stock based on all approved orders (idempotent)
router.post('/orders/process-stock', authenticate, async (req, res) => {
  try {
    // Removed verbose log to reduce terminal noise

    // Use the sync function which calculates expected values and updates to match
    // This is idempotent - safe to run multiple times
    const stockResult = await syncStockFromAllOrders();

    if (!stockResult.success) {
      return res.status(500).json({
        success: false,
        error: stockResult.error || 'Failed to sync stock',
        details: stockResult.errors
      });
    }

    // Removed verbose success log to reduce terminal noise

    await logAuditEvent(req.user.id, 'PROCESS_ORDER_STOCK', {
      action: 'Synced stock from all approved orders',
      products_updated: stockResult.updated,
      errors: stockResult.errors.length
    }, req);

    res.json({
      success: true,
      message: stockResult.updated > 0 
        ? `Stock synced successfully! Updated ${stockResult.updated} product(s)`
        : 'Stock is already up to date',
      updated: stockResult.updated,
      errors: stockResult.errors,
      results: stockResult.results
    });

  } catch (error) {
    console.error('Error syncing order stock:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/orders/statistics - Get order statistics
router.get('/orders-statistics', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('status, total_amount');

    if (error) {
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch order statistics'
      });
    }

    const stats = {
      pending: data.filter(o => o.status === 'pending').length,
      approved: data.filter(o => o.status === 'approved').length,
      in_transit: data.filter(o => o.status === 'in_transit').length,
      complete: data.filter(o => o.status === 'complete').length,
      cancelled: data.filter(o => o.status === 'cancelled').length,
      total: data.length,
      total_revenue: data
        .filter(o => o.status === 'complete')
        .reduce((sum, o) => sum + parseFloat(o.total_amount.toString()), 0)
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error getting statistics:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;

