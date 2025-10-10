/**
 * Order Service for izaj-desktop
 * Handles order management operations
 */

import { supabaseAdmin as supabase } from '../lib/supabase';

export interface OrderItem {
  id: string;
  product_name: string;
  product_image: string | null;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface Order {
  id: string;
  order_number: string;
  user_id: string;
  status: 'pending' | 'approved' | 'in_transit' | 'complete' | 'cancelled';
  total_amount: number;
  shipping_fee: number;
  payment_method: string;
  payment_status: string;
  recipient_name: string;
  shipping_phone: string;
  shipping_address_line1: string;
  shipping_address_line2: string | null;
  shipping_city: string;
  shipping_province: string;
  tracking_number: string | null;
  courier: string | null;
  customer_notes: string | null;
  admin_notes: string | null;
  created_at: string;
  items?: OrderItem[];
}

export class OrderService {
  /**
   * Get all orders with optional filters
   */
  static async getAllOrders(filters: any = {}) {
    console.log('🔵 [OrderService.getAllOrders] Starting...');
    try {
      let query = supabase
        .from('orders')
        .select(`
          *,
          items:order_items(*)
        `)
        .order('created_at', { ascending: false });

      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      console.log('🔵 [OrderService.getAllOrders] Executing query...');
      const { data, error } = await query;

      if (error) {
        console.error('❌ [OrderService.getAllOrders] Query error:', error);
        throw error;
      }

      console.log('✅ [OrderService.getAllOrders] Success! Orders:', data?.length || 0);

      return {
        success: true,
        data: data as Order[],
        count: data.length
      };
    } catch (error: any) {
      console.error('❌ [OrderService.getAllOrders] Error:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  /**
   * Get a single order by ID
   */
  static async getOrderById(orderId: string) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          items:order_items(*)
        `)
        .eq('id', orderId)
        .single();

      if (error) throw error;

      return {
        success: true,
        data: data as Order
      };
    } catch (error: any) {
      console.error('Error getting order:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update order status
   */
  static async updateOrderStatus(orderId: string, newStatus: string, options: any = {}) {
    try {
      const updateData: any = {
        status: newStatus
      };

      if (options.tracking_number) updateData.tracking_number = options.tracking_number;
      if (options.courier) updateData.courier = options.courier;
      if (options.admin_notes) updateData.admin_notes = options.admin_notes;

      const { data, error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        message: `Order status updated to ${newStatus}`,
        data: data as Order
      };
    } catch (error: any) {
      console.error('Error updating order status:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Approve order
   */
  static async approveOrder(orderId: string, options: any = {}) {
    return await this.updateOrderStatus(orderId, 'approved', options);
  }

  /**
   * Mark as in transit
   */
  static async markAsInTransit(orderId: string, trackingNumber: string, courier: string) {
    return await this.updateOrderStatus(orderId, 'in_transit', {
      tracking_number: trackingNumber,
      courier: courier
    });
  }

  /**
   * Mark as complete
   */
  static async markAsComplete(orderId: string) {
    return await this.updateOrderStatus(orderId, 'complete');
  }

  /**
   * Cancel order
   */
  static async cancelOrder(orderId: string, reason: string) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .update({
          status: 'cancelled',
          cancellation_reason: reason,
          cancelled_at: new Date().toISOString()
        })
        .eq('id', orderId)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        message: 'Order cancelled successfully',
        data: data as Order
      };
    } catch (error: any) {
      console.error('Error cancelling order:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get order statistics
   */
  static async getOrderStatistics() {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('status, total_amount');

      if (error) throw error;

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

      return {
        success: true,
        data: stats
      };
    } catch (error: any) {
      console.error('Error getting statistics:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

