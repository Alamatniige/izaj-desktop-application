import express from 'express';
import { supabase } from '../supabaseClient.js';
import authenticate from '../util/middlerware.js';
import { logAuditEvent, AuditActions } from '../util/auditLogger.js';

const router = express.Router();

// GET /api/orders - Get all orders with optional filters
router.get('/orders', authenticate, async (req, res) => {
  try {
    const { status } = req.query;

    let query = supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching orders:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch orders',
        details: error.message
      });
    }

    // Log audit event
    await logAuditEvent(req.user.id, AuditActions.VIEW_ORDERS, {
      filter: status || 'all',
      count: data?.length || 0
    }, req);
    
    res.json({
      success: true,
      data: data || [],
      count: data?.length || 0
    });

  } catch (error) {
    console.error('Server error in orders:', error);
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

    const updateData = { status };
    if (tracking_number) updateData.tracking_number = tracking_number;
    if (courier) updateData.courier = courier;
    if (admin_notes) updateData.admin_notes = admin_notes;

    const { data, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({
        success: false,
        error: 'Failed to update order status',
        details: error.message
      });
    }

    // Log audit event
    await logAuditEvent(req.user.id, AuditActions.UPDATE_ORDER_STATUS, {
      order_id: id,
      order_number: data.order_number,
      old_status: data.status,
      new_status: status,
      tracking_number,
      courier,
      admin_notes
    }, req);

    res.json({
      success: true,
      message: `Order status updated to ${status}`,
      data
    });

  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// PUT /api/orders/:id/cancel - Cancel an order
router.put('/orders/:id/cancel', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

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

