import express from 'express';
import { supabase } from '../supabaseClient.js';
import authenticate from '../util/middlerware.js';
import { logAuditEvent, AuditActions } from '../util/auditLogger.js';

// Use the imported supabase client (already has service role with env variables)
const supabaseAdmin = supabase;

const router = express.Router();

// GET /api/payments - Get all payments (from orders table)
router.get('/payments', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', status = '', payment_method = '' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build query for orders
    let query = supabaseAdmin
      .from('orders')
      .select(`
        id,
        order_number,
        user_id,
        status,
        payment_method,
        payment_status,
        total_amount,
        recipient_name,
        shipping_phone,
        shipping_address_line1,
        created_at
      `)
      .order('created_at', { ascending: false });

    // Add search filter
    if (search) {
      query = query.or(`order_number.ilike.%${search}%,recipient_name.ilike.%${search}%`);
    }

    // Filter by payment status
    if (status) {
      query = query.eq('payment_status', status);
    }

    // Filter by payment method
    if (payment_method) {
      query = query.eq('payment_method', payment_method);
    }

    // Get paginated results
    const { data: payments, error } = await query
      .range(offset, offset + parseInt(limit) - 1);

    if (error) {
      console.error('Error fetching payments:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch payments',
        details: error.message
      });
    }

    // Get total count for pagination
    let countQuery = supabaseAdmin
      .from('orders')
      .select('*', { count: 'exact', head: true });

    if (search) {
      countQuery = countQuery.or(`order_number.ilike.%${search}%,recipient_name.ilike.%${search}%`);
    }
    if (status) {
      countQuery = countQuery.eq('payment_status', status);
    }
    if (payment_method) {
      countQuery = countQuery.eq('payment_method', payment_method);
    }

    const { count, error: countError } = await countQuery;

    if (countError) {
      console.error('Error fetching payment count:', countError);
    }

    // Get user profiles for payments
    const paymentsWithUserInfo = await Promise.all(
      (payments || []).map(async (payment) => {
        // Get user profile
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('name, phone')
          .eq('id', payment.user_id)
          .single();

        // Get user email from auth
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(payment.user_id);

        return {
          ...payment,
          customer_name: profile?.name || payment.recipient_name,
          customer_email: authUser?.user?.email || 'N/A',
          customer_phone: profile?.phone || payment.shipping_phone
        };
      })
    );

    res.json({
      success: true,
      payments: paymentsWithUserInfo,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count || 0,
        pages: Math.ceil((count || 0) / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payments',
      details: error.message
    });
  }
});

// GET /api/payments/stats - Get payment statistics
router.get('/payments/stats', authenticate, async (req, res) => {
  try {
    // Get all orders with payment info
    const { data: orders, error } = await supabaseAdmin
      .from('orders')
      .select('payment_status, payment_method, total_amount');

    if (error) {
      console.error('Error fetching payment stats:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch payment statistics',
        details: error.message
      });
    }

    // Calculate statistics
    const stats = {
      pending: orders.filter(o => o.payment_status === 'pending').length,
      paid: orders.filter(o => o.payment_status === 'paid').length,
      failed: orders.filter(o => o.payment_status === 'failed').length,
      refunded: orders.filter(o => o.payment_status === 'refunded').length,
      total: orders.length,
      total_amount: orders
        .filter(o => o.payment_status === 'paid')
        .reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0),
      by_method: {
        gcash: orders.filter(o => o.payment_method === 'gcash').length,
        maya: orders.filter(o => o.payment_method === 'maya').length,
        cod: orders.filter(o => o.payment_method === 'cod').length,
        bank_transfer: orders.filter(o => o.payment_method === 'bank_transfer').length
      }
    };

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('Error fetching payment stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payment statistics',
      details: error.message
    });
  }
});

// GET /api/payments/:id - Get specific payment details
router.get('/payments/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // Get order with payment info
    const { data: payment, error } = await supabaseAdmin
      .from('orders')
      .select(`
        *,
        order_items (
          product_name,
          quantity,
          unit_price
        )
      `)
      .eq('id', id)
      .single();

    if (error || !payment) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found'
      });
    }

    // Get user profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('name, phone')
      .eq('id', payment.user_id)
      .single();

    // Get user email from auth
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(payment.user_id);

    const paymentDetails = {
      ...payment,
      customer_name: profile?.name || payment.recipient_name,
      customer_email: authUser?.user?.email || 'N/A',
      customer_phone: profile?.phone || payment.shipping_phone
    };

    res.json({
      success: true,
      payment: paymentDetails
    });

  } catch (error) {
    console.error('Error fetching payment details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payment details',
      details: error.message
    });
  }
});

// PUT /api/payments/:id/status - Update payment status
router.put('/payments/:id/status', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { payment_status } = req.body;

    if (!payment_status) {
      return res.status(400).json({
        success: false,
        error: 'Payment status is required'
      });
    }

    // Fetch current order to get old payment_status and order_number
    const { data: currentOrder, error: fetchError } = await supabaseAdmin
      .from('orders')
      .select('payment_status, order_number')
      .eq('id', id)
      .single();

    if (fetchError) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
        details: fetchError.message
      });
    }

    const oldPaymentStatus = currentOrder.payment_status;

    const { data, error } = await supabaseAdmin
      .from('orders')
      .update({ payment_status })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({
        success: false,
        error: 'Failed to update payment status',
        details: error.message
      });
    }

    // Log audit event (don't let this fail the request)
    try {
      await logAuditEvent(req.user.id, AuditActions.UPDATE_PAYMENT_STATUS, {
        order_id: id,
        order_number: currentOrder.order_number,
        old_payment_status: oldPaymentStatus,
        new_payment_status: payment_status
      }, req);
    } catch (auditError) {
      console.error('⚠️ Audit logging failed (non-critical):', auditError);
    }

    res.json({
      success: true,
      message: 'Payment status updated successfully',
      payment: data
    });

  } catch (error) {
    console.error('Error updating payment status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update payment status',
      details: error.message
    });
  }
});

export default router;

