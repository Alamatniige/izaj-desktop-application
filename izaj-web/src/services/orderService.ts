/**
 * Order Service
 * Handles all order-related API calls
 */

import { Order, OrderStatus, CreateOrderRequest } from '@/types/order';

const API_BASE_URL = '/api/orders';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  count?: number;
}

/**
 * Get all orders for the authenticated user
 * @param status - Filter by status (optional)
 * @param limit - Number of orders to fetch
 * @param offset - Offset for pagination
 */
export async function getOrders(
  status?: OrderStatus | 'all',
  limit: number = 50,
  offset: number = 0
): Promise<ApiResponse<Order[]>> {
  try {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString()
    });

    if (status && status !== 'all') {
      params.append('status', status);
    }

    const response = await fetch(`${API_BASE_URL}?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store' // Always fetch fresh data
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch orders');
    }

    return data;
  } catch (error) {
    console.error('Error fetching orders:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch orders',
      data: []
    };
  }
}

/**
 * Get a single order by ID
 * @param orderId - Order ID
 */
export async function getOrderById(orderId: string): Promise<ApiResponse<Order>> {
  try {
    const response = await fetch(`${API_BASE_URL}/${orderId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store'
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch order');
    }

    return data;
  } catch (error) {
    console.error('Error fetching order:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch order'
    };
  }
}

/**
 * Create a new order
 * @param orderData - Order data
 */
export async function createOrder(orderData: CreateOrderRequest): Promise<ApiResponse<Order>> {
  try {
    console.log('📦 Creating order with data:', orderData);
    
    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderData)
    });

    console.log('📦 Response status:', response.status, response.statusText);
    
    let data;
    try {
      data = await response.json();
      console.log('📦 Order API response:', data);
    } catch (parseError) {
      console.error('❌ Failed to parse response:', parseError);
      throw new Error('Invalid response from server. Check if database schema is installed.');
    }

    if (!response.ok) {
      console.error('❌ Order creation failed (HTTP ' + response.status + '):', data);
      const errorMsg = data.error || data.message || `Server returned ${response.status}`;
      
      // Check for specific errors
      if (errorMsg.includes('relation') || errorMsg.includes('does not exist')) {
        throw new Error('⚠️ Database tables not found!\n\nPlease run orders-schema.sql in Supabase SQL Editor.\n\nSee QUICK_SETUP.md for 2-minute setup instructions.');
      }
      
      throw new Error(errorMsg);
    }

    console.log('✅ Order created successfully:', data);
    return data;
  } catch (error) {
    console.error('❌ Error creating order:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create order'
    };
  }
}

/**
 * Update order notes
 * @param orderId - Order ID
 * @param notes - Customer notes
 */
export async function updateOrderNotes(
  orderId: string,
  notes: string
): Promise<ApiResponse<Order>> {
  try {
    const response = await fetch(`${API_BASE_URL}/${orderId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ customer_notes: notes })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to update order');
    }

    return data;
  } catch (error) {
    console.error('Error updating order:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update order'
    };
  }
}

/**
 * Cancel order (only if status is 'pending')
 * @param orderId - Order ID
 * @param reason - Cancellation reason
 */
export async function cancelOrder(
  orderId: string,
  reason: string = 'Cancelled by customer'
): Promise<ApiResponse<Order>> {
  try {
    console.log('🔵 Cancelling order:', orderId, 'Reason:', reason);
    
    const response = await fetch(`${API_BASE_URL}/${orderId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reason })
    });

    console.log('🔵 Cancel response status:', response.status);
    
    const data = await response.json();
    console.log('🔵 Cancel response data:', data);

    if (!response.ok) {
      console.error('❌ Cancel failed:', data.error);
      throw new Error(data.error || 'Failed to cancel order');
    }

    console.log('✅ Order cancelled successfully');
    return data;
  } catch (error) {
    console.error('❌ Error cancelling order:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to cancel order'
    };
  }
}

/**
 * Get orders by status with count
 * @param status - Order status
 */
export async function getOrdersByStatus(status: OrderStatus): Promise<{
  orders: Order[];
  count: number;
}> {
  const result = await getOrders(status);
  return {
    orders: result.data || [],
    count: result.count || 0
  };
}

/**
 * Get pending orders count
 */
export async function getPendingOrdersCount(): Promise<number> {
  const result = await getOrders('pending', 1, 0);
  return result.count || 0;
}

/**
 * Check if order can be cancelled
 * @param order - Order object
 */
export function canCancelOrder(order: Order): boolean {
  return order.status === 'pending';
}

/**
 * Check if order can be modified
 * @param order - Order object
 */
export function canModifyOrder(order: Order): boolean {
  return order.status === 'pending';
}

/**
 * Get order status progress percentage
 * @param status - Order status
 */
export function getOrderProgress(status: OrderStatus): number {
  const progressMap: Record<OrderStatus, number> = {
    pending: 0,
    approved: 25,
    delivering: 50,
    delivered: 75,
    complete: 100,
    cancelled: 0
  };
  return progressMap[status];
}

/**
 * Format order for display
 * @param order - Order object
 */
export function formatOrderForDisplay(order: Order) {
  return {
    ...order,
    formattedDate: new Date(order.created_at).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }),
    formattedTotal: `₱${order.total_amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`,
    itemCount: order.items?.length || 0,
    totalItems: order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0
  };
}

/**
 * Validate order before creation
 * @param orderData - Order data to validate
 */
export function validateOrderData(orderData: CreateOrderRequest): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate items
  if (!orderData.items || orderData.items.length === 0) {
    errors.push('Order must contain at least one item');
  }

  // Validate shipping info
  if (!orderData.shipping_address_line1) {
    errors.push('Shipping address is required');
  }
  if (!orderData.shipping_city) {
    errors.push('City is required');
  }
  if (!orderData.shipping_province) {
    errors.push('Province is required');
  }
  if (!orderData.shipping_phone) {
    errors.push('Phone number is required');
  }
  if (!orderData.recipient_name) {
    errors.push('Recipient name is required');
  }

  // Validate payment method
  if (!orderData.payment_method) {
    errors.push('Payment method is required');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

