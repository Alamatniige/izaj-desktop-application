// App Configuration
export const APP_CONFIG = {
  name: 'IZAJ',
  description: 'Your one-stop shop for quality products at great prices',
  url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002',
  currency: 'PHP',
  currencySymbol: '₱',
};

// API Configuration
export const API_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api',
  timeout: 10000,
};

// Cart Configuration
export const CART_CONFIG = {
  freeShippingThreshold: 2000,
  shippingCost: 150,
  taxRate: 0.12,
  maxQuantity: 99,
};

// Product Categories
export const PRODUCT_CATEGORIES = [
  { id: 'electronics', name: 'Electronics', icon: '📱' },
  { id: 'clothing', name: 'Clothing', icon: '👕' },
  { id: 'home', name: 'Home & Garden', icon: '🏠' },
  { id: 'sports', name: 'Sports & Outdoors', icon: '⚽' },
  { id: 'books', name: 'Books', icon: '📚' },
  { id: 'beauty', name: 'Beauty & Health', icon: '💄' },
];

// Payment Methods
export const PAYMENT_METHODS = [
  { id: 'credit_card', name: 'Credit Card', icon: '💳' },
  { id: 'debit_card', name: 'Debit Card', icon: '💳' },
  { id: 'gcash', name: 'GCash', icon: '📱' },
  { id: 'paypal', name: 'PayPal', icon: '💰' },
  { id: 'bank_transfer', name: 'Bank Transfer', icon: '🏦' },
];

// Order Status
export const ORDER_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PROCESSING: 'processing',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
} as const;

// User Roles
export const USER_ROLES = {
  CUSTOMER: 'customer',
  ADMIN: 'admin',
  MODERATOR: 'moderator',
} as const;

// Pagination
export const PAGINATION = {
  defaultPageSize: 12,
  maxPageSize: 100,
};

// File Upload
export const FILE_UPLOAD = {
  maxSize: 5 * 1024 * 1024, // 5MB
  allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
};

// Validation Rules
export const VALIDATION_RULES = {
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Please enter a valid email address',
  },
  phone: {
    pattern: /^(\+63|0)?[0-9]{10}$/,
    message: 'Please enter a valid Philippine phone number',
  },
  password: {
    minLength: 8,
    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
    message: 'Password must be at least 8 characters with uppercase, lowercase, and number',
  },
  postalCode: {
    pattern: /^[0-9]{4}$/,
    message: 'Please enter a valid 4-digit postal code',
  },
};
