/**
 * Order Service for izaj-desktop
 * Handles order management operations via Backend API
 */

import { Session } from '@supabase/supabase-js';
import API_URL from '../../config/api';

export interface OrderItem {
  id: string;
  product_name: string;
  product_image: string | null;
  category?: string | null;
  category_name?: string | null;
  quantity: number;
  unit_price: number;
  total: number;
  original_price?: number;
}

export interface Order {
  id: string;
  order_number: string;
  user_id: string;
  status: 'pending' | 'approved' | 'in_transit' | 'complete' | 'cancelled' | 'pending_cancellation';
  total_amount: number;
  shipping_fee: number;
  shipping_fee_confirmed?: boolean;
  payment_method: string;
  payment_status: string;
  payment_reference?: string | null;
  recipient_name: string;
  shipping_phone: string;
  shipping_address_line1: string;
  shipping_address_line2: string | null;
  shipping_city: string;
  shipping_province: string;
  shipping_barangay?: string | null;
  shipping_postal_code?: string | null;
  tracking_number: string | null;
  courier: string | null;
  customer_notes: string | null;
  admin_notes: string | null;
  created_at: string;
  items?: OrderItem[];
  order_items?: OrderItem[];
}

export interface OrderFilters {
  status?: string;
}

export interface UpdateOrderOptions {
  tracking_number?: string;
  courier?: string;
  admin_notes?: string;
  shipping_fee?: number;
  payment_status?: string;
}

export class OrderService {
  private static getHeaders(session: Session | null): HeadersInit {
    return {
      'Content-Type': 'application/json',
      ...(session?.access_token && { 'Authorization': `Bearer ${session.access_token}` })
    };
  }

  /**
   * Get all orders with optional filters
   */
  static async getAllOrders(session: Session | null, filters: OrderFilters = {}) {
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);

      const response = await fetch(`${API_URL}/api/orders?${params.toString()}`, {
        method: 'GET',
        headers: this.getHeaders(session)
      });

      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }

      return await response.json();
    } catch (error) {
      console.error('❌ [OrderService.getAllOrders] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: []
      };
    }
  }

  /**
   * Get a single order by ID
   */
  static async getOrderById(session: Session | null, orderId: string) {
    try {
      const response = await fetch(`${API_URL}/api/orders/${orderId}`, {
        method: 'GET',
        headers: this.getHeaders(session)
      });

      if (!response.ok) {
        throw new Error('Failed to fetch order');
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting order:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Update order status
   */
  static async updateOrderStatus(session: Session | null, orderId: string, newStatus: string, options: UpdateOrderOptions = {}) {
    try {
      const updateData = {
        status: newStatus,
        ...options
      };

      console.log('📝 [OrderService] Updating order status:', { orderId, newStatus, options });

      const response = await fetch(`${API_URL}/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: this.getHeaders(session),
        body: JSON.stringify(updateData)
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('❌ [OrderService] Update failed:', data);
        const errorMessage = data.details || data.error || 'Failed to update order status';
        throw new Error(errorMessage);
      }

      console.log('✅ [OrderService] Update successful:', data);
      return data;
    } catch (error) {
      console.error('❌ [OrderService] Error updating order status:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Set shipping fee (sends email automatically)
   */
  static async setShippingFee(session: Session | null, orderId: string, shippingFee: number) {
    try {
      console.log('📝 [OrderService] Setting shipping fee:', { orderId, shippingFee });

      const response = await fetch(`${API_URL}/api/orders/${orderId}/shipping-fee`, {
        method: 'PUT',
        headers: this.getHeaders(session),
        body: JSON.stringify({ shipping_fee: shippingFee })
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('❌ [OrderService] Set shipping fee failed:', data);
        const errorMessage = data.details || data.error || 'Failed to set shipping fee';
        throw new Error(errorMessage);
      }

      console.log('✅ [OrderService] Shipping fee set successfully:', data);
      return data;
    } catch (error) {
      console.error('❌ [OrderService] Error setting shipping fee:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Approve order
   */
  static async approveOrder(session: Session | null, orderId: string, options: UpdateOrderOptions = {}) {
    return await this.updateOrderStatus(session, orderId, 'approved', options);
  }

  /**
   * Mark as in transit
   */
  static async markAsInTransit(session: Session | null, orderId: string, trackingNumber: string, courier: string) {
    return await this.updateOrderStatus(session, orderId, 'in_transit', {
      tracking_number: trackingNumber,
      courier: courier
    });
  }

  /**
   * Mark as complete
   */
  static async markAsComplete(session: Session | null, orderId: string) {
    return await this.updateOrderStatus(session, orderId, 'complete');
  }

  /**
   * Cancel order
   */
  static async cancelOrder(session: Session | null, orderId: string, reason: string) {
    try {
      const response = await fetch(`${API_URL}/api/orders/${orderId}/cancel`, {
        method: 'PUT',
        headers: this.getHeaders(session),
        body: JSON.stringify({ reason })
      });

      if (!response.ok) {
        throw new Error('Failed to cancel order');
      }

      return await response.json();
    } catch (error) {
      console.error('Error cancelling order:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Approve cancellation request
   */
  static async approveCancellation(session: Session | null, orderId: string, reason: string) {
    try {
      const response = await fetch(`${API_URL}/api/orders/${orderId}/approve-cancellation`, {
        method: 'PUT',
        headers: this.getHeaders(session),
        body: JSON.stringify({ reason })
      });

      if (!response.ok) {
        throw new Error('Failed to approve cancellation');
      }

      return await response.json();
    } catch (error) {
      console.error('Error approving cancellation:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Decline cancellation request
   */
  static async declineCancellation(session: Session | null, orderId: string) {
    try {
      const response = await fetch(`${API_URL}/api/orders/${orderId}/decline-cancellation`, {
        method: 'PUT',
        headers: this.getHeaders(session),
        body: JSON.stringify({})
      });

      if (!response.ok) {
        throw new Error('Failed to decline cancellation');
      }

      return await response.json();
    } catch (error) {
      console.error('Error declining cancellation:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get order statistics
   */
  static async getOrderStatistics(session: Session | null) {
    try {
      const response = await fetch(`${API_URL}/api/orders-statistics`, {
        method: 'GET',
        headers: this.getHeaders(session)
      });

      if (!response.ok) {
        throw new Error('Failed to fetch order statistics');
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting statistics:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Process stock updates for existing approved orders
   */
  static async processStockForOrders(session: Session | null, orderIds?: string[]) {
    try {
      const response = await fetch(`${API_URL}/api/orders/process-stock`, {
        method: 'POST',
        headers: this.getHeaders(session),
        body: JSON.stringify({ orderIds })
      });

      if (!response.ok) {
        throw new Error('Failed to process stock for orders');
      }

      return await response.json();
    } catch (error) {
      console.error('Error processing stock for orders:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

