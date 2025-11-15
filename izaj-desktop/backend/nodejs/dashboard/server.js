import express from 'express';
import { supabase } from '../supabaseClient.js';
import authenticate from '../util/middlerware.js';

// Use the imported supabase client (already has service role with env variables)
const supabaseAdmin = supabase;

const router = express.Router();

// GET /api/dashboard/stats - Get overall dashboard statistics
router.get('/dashboard/stats', authenticate, async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    const now = new Date();
    let startDate = new Date();

    // Calculate start date based on period
    switch (period) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setMonth(now.getMonth() - 1);
    }

    // Get all admin user IDs to exclude from customer count
    const { data: adminUsers, error: adminUsersError } = await supabaseAdmin
      .from('adminUser')
      .select('user_id');

    const adminUserIds = adminUsers ? adminUsers.map(admin => admin.user_id) : [];
    
    // Build query to exclude admin users
    let customerQuery = supabaseAdmin
      .from('user_profiles')
      .select('id', { count: 'exact', head: false })
      .or('user_type.eq.customer,user_type.is.null');

    // Execute query to get all customer profiles
    const { data: customerProfiles, error: customerError } = await customerQuery;

    // Filter out admin users and get count
    const totalCustomers = customerProfiles 
      ? customerProfiles.filter(profile => !adminUserIds.includes(profile.id)).length 
      : 0;

    if (customerError) {
      console.error('Error fetching customer count:', customerError);
    }
    if (adminUsersError) {
      console.error('Error fetching admin users:', adminUsersError);
    }

    // Get order statistics (use admin client to bypass RLS)
    const { data: orders, error: ordersError } = await supabaseAdmin
      .from('orders')
      .select('status, total_amount, created_at');

    if (ordersError) {
      console.error('Error fetching orders:', ordersError);
    }

    // Calculate order statistics
    const orderStats = {
      pending: 0,
      approved: 0,
      in_transit: 0,
      complete: 0,
      cancelled: 0,
      total: 0
    };

    let totalEarnings = 0;
    let periodEarnings = 0;

    if (orders) {
      orders.forEach(order => {
        orderStats[order.status] = (orderStats[order.status] || 0) + 1;
        orderStats.total += 1;
        
        // Only count earnings from completed orders
        if (order.status === 'complete') {
          const amount = parseFloat(order.total_amount || 0);
          totalEarnings += amount;
          
          // Check if order is within the period
          if (new Date(order.created_at) >= startDate) {
            periodEarnings += amount;
          }
        }
      });
    }

    // Get customer count for the period (only customer type users, excluding admin users)
    const { data: periodCustomerProfiles, error: periodCustomerError } = await supabaseAdmin
      .from('user_profiles')
      .select('id')
      .gte('created_at', startDate.toISOString())
      .or('user_type.eq.customer,user_type.is.null');

    // Filter out admin users and get count
    const periodCustomers = periodCustomerProfiles 
      ? periodCustomerProfiles.filter(profile => !adminUserIds.includes(profile.id)).length 
      : 0;

    // Calculate growth percentage
    const previousPeriodEarnings = totalEarnings - periodEarnings;
    const earningsGrowth = previousPeriodEarnings > 0 
      ? ((periodEarnings - previousPeriodEarnings) / previousPeriodEarnings * 100).toFixed(1)
      : 0;

    res.json({
      success: true,
      stats: {
        customers: {
          total: totalCustomers || 0,
          period: periodCustomers || 0,
          percentage: totalCustomers > 0 ? ((periodCustomers || 0) / totalCustomers * 100).toFixed(1) : 0
        },
        orders: orderStats,
        earnings: {
          total: totalEarnings.toFixed(2),
          period: periodEarnings.toFixed(2),
          growth: earningsGrowth,
          currency: 'PHP'
        }
      },
      period,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard statistics',
      details: error.message
    });
  }
});

// GET /api/dashboard/sales-report - Get monthly sales data for chart
router.get('/dashboard/sales-report', authenticate, async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;
    
    // Get all completed orders for the year
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59);

    const { data: orders, error } = await supabaseAdmin
      .from('orders')
      .select('total_amount, created_at, status')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .eq('status', 'complete');

    if (error) {
      console.error('Error fetching sales report:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch sales report',
        details: error.message
      });
    }

    // Group by month
    const monthlyData = Array(12).fill(0).map((_, index) => ({
      month: new Date(year, index).toLocaleString('en-US', { month: 'long' }),
      sales: 0,
      orders: 0,
      growth: 0
    }));

    (orders || []).forEach(order => {
      const month = new Date(order.created_at).getMonth();
      monthlyData[month].sales += parseFloat(order.total_amount || 0);
      monthlyData[month].orders += 1;
    });

    // Calculate growth for each month
    monthlyData.forEach((data, index) => {
      if (index > 0) {
        const previousSales = monthlyData[index - 1].sales;
        if (previousSales > 0) {
          data.growth = ((data.sales - previousSales) / previousSales * 100).toFixed(1);
        }
      }
    });

    // Calculate summary
    const totalSales = monthlyData.reduce((sum, data) => sum + data.sales, 0);
    const totalOrders = monthlyData.reduce((sum, data) => sum + data.orders, 0);
    const averageGrowth = monthlyData.length > 1 
      ? (monthlyData.reduce((sum, data) => sum + parseFloat(data.growth), 0) / (monthlyData.length - 1)).toFixed(1)
      : 0;

    res.json({
      success: true,
      salesReport: {
        monthly: monthlyData,
        summary: {
          totalSales: totalSales.toFixed(2),
          totalOrders,
          averageGrowth
        },
        year: parseInt(year)
      }
    });

  } catch (error) {
    console.error('Error fetching sales report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sales report',
      details: error.message
    });
  }
});

// GET /api/dashboard/best-selling - Get best selling products
router.get('/dashboard/best-selling', authenticate, async (req, res) => {
  try {
    const { limit = 10, category } = req.query;

    // Get order items from completed orders only (use admin client to bypass RLS)
    let query = supabaseAdmin
      .from('order_items')
      .select(`
        product_id,
        product_name,
        quantity,
        unit_price,
        orders!inner(status)
      `)
      .eq('orders.status', 'complete');

    const { data: orderItems, error } = await query;

    if (error) {
      console.error('Error fetching order items:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch best selling products',
        details: error.message
      });
    }

    // Group by product and calculate totals
    const productMap = new Map();

    (orderItems || []).forEach(item => {
      if (!productMap.has(item.product_id)) {
        productMap.set(item.product_id, {
          product_id: item.product_id,
          product_name: item.product_name,
          total_quantity: 0,
          total_revenue: 0,
          order_count: 0
        });
      }
      
      const product = productMap.get(item.product_id);
      product.total_quantity += item.quantity;
      product.total_revenue += item.unit_price * item.quantity;
      product.order_count += 1;
    });

    // Convert to array and sort by total quantity
    const bestSelling = Array.from(productMap.values())
      .sort((a, b) => b.total_quantity - a.total_quantity)
      .slice(0, parseInt(limit));

    // Add review data for each product
    for (const product of bestSelling) {
      const { data: reviews, error: reviewError } = await supabaseAdmin
        .from('reviews')
        .select('rating')
        .eq('product_id', product.product_id);

      if (!reviewError && reviews && reviews.length > 0) {
        const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
        product.review_count = reviews.length;
        product.average_rating = (totalRating / reviews.length).toFixed(1);
      } else {
        product.review_count = 0;
        product.average_rating = 0;
      }
    }

    res.json({
      success: true,
      bestSelling,
      total: bestSelling.length
    });

  } catch (error) {
    console.error('Error fetching best selling products:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch best selling products',
      details: error.message
    });
  }
});

// GET /api/dashboard/monthly-earnings - Get monthly earnings data
router.get('/dashboard/monthly-earnings', authenticate, async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;
    
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59);

    const { data: orders, error } = await supabaseAdmin
      .from('orders')
      .select('total_amount, created_at')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .eq('status', 'complete');

    if (error) {
      console.error('Error fetching monthly earnings:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch monthly earnings',
        details: error.message
      });
    }

    // Initialize monthly earnings array
    const monthlyEarnings = Array(12).fill(0);

    (orders || []).forEach(order => {
      const month = new Date(order.created_at).getMonth();
      monthlyEarnings[month] += parseFloat(order.total_amount || 0);
    });

    res.json({
      success: true,
      monthlyEarnings,
      year: parseInt(year)
    });

  } catch (error) {
    console.error('Error fetching monthly earnings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch monthly earnings',
      details: error.message
    });
  }
});

export default router;
