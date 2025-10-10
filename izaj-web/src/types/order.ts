// Order Types for IZAJ Web

export type OrderStatus = 
  | 'pending' 
  | 'approved' 
  | 'in_transit' 
  | 'complete' 
  | 'cancelled';

export type PaymentStatus = 
  | 'pending' 
  | 'paid' 
  | 'failed' 
  | 'refunded';

export type PaymentMethod = 
  | 'cash_on_delivery' 
  | 'gcash' 
  | 'maya' 
  | 'credit_card' 
  | 'bank_transfer';

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  product_image?: string;
  product_sku?: string;
  unit_price: number;
  quantity: number;
  subtotal: number;
  discount: number;
  total: number;
  product_variant?: string;
  created_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  user_id: string;
  
  // Status
  status: OrderStatus;
  
  // Order Information
  subtotal: number;
  shipping_fee: number;
  discount: number;
  total_amount: number;
  
  // Shipping Information
  shipping_address_line1: string;
  shipping_address_line2?: string;
  shipping_city: string;
  shipping_province: string;
  shipping_postal_code?: string;
  shipping_phone: string;
  recipient_name: string;
  
  // Payment Information
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  payment_reference?: string;
  
  // Tracking
  tracking_number?: string;
  courier?: string;
  
  // Notes
  customer_notes?: string;
  admin_notes?: string;
  cancellation_reason?: string;
  
  // Timestamps
  created_at: string;
  updated_at: string;
  approved_at?: string;
  shipped_at?: string;
  delivered_at?: string;
  completed_at?: string;
  cancelled_at?: string;
  
  // Relations (populated when needed)
  items?: OrderItem[];
  status_history?: OrderStatusHistory[];
}

export interface OrderStatusHistory {
  id: string;
  order_id: string;
  previous_status?: OrderStatus;
  new_status: OrderStatus;
  changed_by_user_id?: string;
  changed_by_admin: boolean;
  notes?: string;
  created_at: string;
}

export interface CreateOrderRequest {
  // Items (with product details from cart)
  items: Array<{
    product_id: string;
    name: string;
    price: number;
    image?: string;
    quantity: number;
    variant?: string;
    sku?: string;
  }>;
  
  // Shipping
  shipping_address_line1: string;
  shipping_address_line2?: string;
  shipping_city: string;
  shipping_province: string;
  shipping_postal_code?: string;
  shipping_phone: string;
  recipient_name: string;
  
  // Payment
  payment_method: PaymentMethod;
  payment_reference?: string;
  
  // Notes
  customer_notes?: string;
}

export interface OrderSummary {
  id: string;
  order_number: string;
  user_id: string;
  status: OrderStatus;
  total_amount: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  created_at: string;
  item_count: number;
  total_items: number;
  recipient_name: string;
  shipping_city: string;
  tracking_number?: string;
}

export interface UpdateOrderStatusRequest {
  order_id: string;
  new_status: OrderStatus;
  notes?: string;
  tracking_number?: string;
}

export interface CancelOrderRequest {
  order_id: string;
  cancellation_reason: string;
}

// Helper functions
export const getStatusLabel = (status: OrderStatus): string => {
  const labels: Record<OrderStatus, string> = {
    pending: 'Pending',
    approved: 'Approved',
    in_transit: 'In Transit',
    complete: 'Complete',
    cancelled: 'Cancelled'
  };
  return labels[status];
};

export const getPaymentMethodLabel = (method: PaymentMethod): string => {
  const labels: Record<PaymentMethod, string> = {
    cash_on_delivery: 'Cash on Delivery',
    gcash: 'GCash',
    maya: 'Maya',
    credit_card: 'Credit Card',
    bank_transfer: 'Bank Transfer'
  };
  return labels[method];
};

export const getStatusColor = (status: OrderStatus): string => {
  const colors: Record<OrderStatus, string> = {
    pending: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    approved: 'text-blue-600 bg-blue-50 border-blue-200',
    in_transit: 'text-purple-600 bg-purple-50 border-purple-200',
    complete: 'text-green-600 bg-green-50 border-green-200',
    cancelled: 'text-red-600 bg-red-50 border-red-200'
  };
  return colors[status];
};

export const getStatusIcon = (status: OrderStatus): string => {
  const icons: Record<OrderStatus, string> = {
    pending: 'mdi:clock-outline',
    approved: 'mdi:check-circle',
    in_transit: 'mdi:truck-fast',
    complete: 'mdi:check-all',
    cancelled: 'mdi:close-circle'
  };
  return icons[status];
};

export const formatOrderNumber = (orderNumber: string): string => {
  return orderNumber.toUpperCase();
};

export const formatCurrency = (amount: number): string => {
  return `₱${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
