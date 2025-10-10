import express from 'express';
import { supabase } from '../supabaseClient.js';
import authenticate from '../util/middlerware.js';

// Create a service role client for admin operations
import { createClient } from '@supabase/supabase-js';
const supabaseUrl = 'https://rhckwqhpnzjqfsjohvzk.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJoY2t3cWhwbnpqcWZzam9odnprIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODE3NTY5MywiZXhwIjoyMDYzNzUxNjkzfQ.G5z39k1UXNrmCNh1hxHLCC4YJuDfpVMyE__9lShW0e4';

// Service role client bypasses RLS for admin operations
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const router = express.Router();

// GET /api/customers - Get all customers with pagination and search
router.get('/customers', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Query only customer type users (excluding admins)
    let query = supabaseAdmin
      .from('user_profiles')
      .select(`
        id,
        email,
        name,
        phone,
        profile_picture,
        created_at,
        updated_at,
        user_type
      `)
      .or('user_type.eq.customer,user_type.is.null') // Include customers and null (legacy data)
      .order('created_at', { ascending: false });

    // Add search filter if provided
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    // Get total count for pagination (only customers)
    const { count, error: countError } = await supabaseAdmin
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
      .or('user_type.eq.customer,user_type.is.null');

    if (countError) {
      console.error('Error fetching customer count:', countError);
    }

    // Get paginated results
    const { data: customers, error } = await query
      .range(offset, offset + parseInt(limit) - 1);

    if (error) {
      console.error('Error fetching customers:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch customers',
        details: error.message
      });
    }

    // Get additional data for each customer
    const customersWithStats = await Promise.all(
      (customers || []).map(async (customer) => {
        // Get order count and total spent
        const { data: orders, error: ordersError } = await supabaseAdmin
          .from('orders')
          .select('total_amount')
          .eq('user_id', customer.id);

        const orderCount = orders?.length || 0;
        const totalSpent = orders?.reduce((sum, order) => sum + parseFloat(order.total_amount || 0), 0) || 0;

        // Get review count
        const { data: reviews, error: reviewsError } = await supabaseAdmin
          .from('reviews')
          .select('id')
          .eq('user_id', customer.id);

        const reviewCount = reviews?.length || 0;

        return {
          ...customer,
          order_count: orderCount,
          total_spent: totalSpent.toFixed(2),
          review_count: reviewCount
        };
      })
    );

    res.json({
      success: true,
      customers: customersWithStats,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count || 0,
        pages: Math.ceil((count || 0) / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch customers',
      details: error.message
    });
  }
});

// GET /api/customers/:id - Get specific customer details
router.get('/customers/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // Get customer profile (only if user_type is customer or null)
    const { data: customer, error: customerError } = await supabaseAdmin
      .from('user_profiles')
      .select(`
        id,
        email,
        name,
        phone,
        profile_picture,
        created_at,
        updated_at,
        user_type
      `)
      .eq('id', id)
      .or('user_type.eq.customer,user_type.is.null')
      .single();

    if (customerError || !customer) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }

    // Get customer orders
    const { data: orders, error: ordersError } = await supabaseAdmin
      .from('orders')
      .select(`
        id,
        total_amount,
        status,
        created_at,
        order_items (
          product_name,
          quantity,
          unit_price
        )
      `)
      .eq('user_id', id)
      .order('created_at', { ascending: false });

    // Get customer reviews
    const { data: reviews, error: reviewsError } = await supabaseAdmin
      .from('reviews')
      .select(`
        id,
        rating,
        comment,
        created_at,
        products (
          product_name
        )
      `)
      .eq('user_id', id)
      .order('created_at', { ascending: false });

    // Calculate statistics
    const orderCount = orders?.length || 0;
    const totalSpent = orders?.reduce((sum, order) => sum + parseFloat(order.total_amount || 0), 0) || 0;
    const reviewCount = reviews?.length || 0;
    const averageRating = reviewCount > 0 
      ? (reviews?.reduce((sum, review) => sum + review.rating, 0) / reviewCount).toFixed(1)
      : 0;

    res.json({
      success: true,
      customer: {
        ...customer,
        order_count: orderCount,
        total_spent: totalSpent.toFixed(2),
        review_count: reviewCount,
        average_rating: averageRating,
        orders: orders || [],
        reviews: reviews || []
      }
    });

  } catch (error) {
    console.error('Error fetching customer details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch customer details',
      details: error.message
    });
  }
});

// GET /api/customers/stats/summary - Get customer statistics
router.get('/customers/stats/summary', authenticate, async (req, res) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(today.getTime() - (today.getDay() * 24 * 60 * 60 * 1000));
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get total customers (only customer type)
    const { count: total, error: totalError } = await supabaseAdmin
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
      .or('user_type.eq.customer,user_type.is.null');

    // Get customers registered today
    const { count: todayCount, error: todayError } = await supabaseAdmin
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString())
      .or('user_type.eq.customer,user_type.is.null');

    // Get customers registered this week
    const { count: thisWeekCount, error: thisWeekError } = await supabaseAdmin
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', thisWeek.toISOString())
      .or('user_type.eq.customer,user_type.is.null');

    // Get customers registered this month
    const { count: thisMonthCount, error: thisMonthError } = await supabaseAdmin
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', thisMonth.toISOString())
      .or('user_type.eq.customer,user_type.is.null');

    // Get all customer IDs (for active customer calculation)
    const { data: allCustomers } = await supabaseAdmin
      .from('user_profiles')
      .select('id')
      .or('user_type.eq.customer,user_type.is.null');

    const customerIds = new Set(allCustomers?.map(c => c.id) || []);

    // Get active customers (customers with orders in last 30 days)
    const { data: activeCustomers, error: activeError } = await supabaseAdmin
      .from('orders')
      .select('user_id')
      .gte('created_at', new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000)).toISOString());

    const activeCustomerIds = new Set(
      (activeCustomers || [])
        .map(order => order.user_id)
        .filter(userId => customerIds.has(userId))
    );
    const active = activeCustomerIds.size;

    // Calculate inactive customers
    const inactive = (total || 0) - active;

    res.json({
      success: true,
      stats: {
        total: total || 0,
        active,
        today: todayCount || 0,
        thisWeek: thisWeekCount || 0,
        thisMonth: thisMonthCount || 0,
        inactive
      }
    });

  } catch (error) {
    console.error('Error fetching customer stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch customer statistics',
      details: error.message
    });
  }
});

export default router;
