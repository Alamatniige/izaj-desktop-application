/**
 * Payment Service for izaj-desktop
 * Handles payment-related operations (data comes from orders table)
 */

import { Session } from '@supabase/supabase-js';
import API_URL from '../../config/api';

export interface Payment {
  id: string;
  order_number: string;
  user_id: string;
  status: 'pending' | 'approved' | 'in_transit' | 'complete' | 'cancelled';
  payment_method: string;
  payment_status: string;
  total_amount: number;
  recipient_name: string;
  shipping_phone: string;
  shipping_address_line1: string;
  created_at: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
}

export interface PaymentStats {
  pending: number;
  paid: number;
  failed: number;
  refunded: number;
  total: number;
  total_amount: number;
  by_method: {
    gcash: number;
    maya: number;
    cod: number;
    bank_transfer: number;
  };
}

export class PaymentService {
  private static getHeaders(session: Session | null) {
    return {
      'Content-Type': 'application/json',
      ...(session?.access_token && {
        'Authorization': `Bearer ${session.access_token}`
      })
    };
  }

  /**
   * Get all payments with pagination and filters
   */
  static async getAllPayments(
    session: Session | null,
    page: number = 1,
    limit: number = 10,
    filters: {
      search?: string;
      status?: string;
      payment_method?: string;
    } = {}
  ) {
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      
      if (filters.search) params.append('search', filters.search);
      if (filters.status) params.append('status', filters.status);
      if (filters.payment_method) params.append('payment_method', filters.payment_method);

      const response = await fetch(`${API_URL}/api/payments?${params.toString()}`, {
        method: 'GET',
        headers: this.getHeaders(session)
      });

      if (!response.ok) {
        throw new Error('Failed to fetch payments');
      }

      return await response.json();
    } catch (error: any) {
      console.error('Error fetching payments:', error);
      return {
        success: false,
        error: error.message,
        payments: [],
        pagination: { page: 1, limit, total: 0, pages: 0 }
      };
    }
  }

  /**
   * Get payment statistics
   */
  static async getPaymentStats(session: Session | null) {
    try {
      const response = await fetch(`${API_URL}/api/payments/stats`, {
        method: 'GET',
        headers: this.getHeaders(session)
      });

      if (!response.ok) {
        throw new Error('Failed to fetch payment statistics');
      }

      return await response.json();
    } catch (error: any) {
      console.error('Error fetching payment stats:', error);
      return {
        success: false,
        error: error.message,
        stats: {
          pending: 0,
          paid: 0,
          failed: 0,
          refunded: 0,
          total: 0,
          total_amount: 0,
          by_method: { gcash: 0, maya: 0, cod: 0, bank_transfer: 0 }
        }
      };
    }
  }

  /**
   * Get a single payment by ID
   */
  static async getPaymentById(session: Session | null, paymentId: string) {
    try {
      const response = await fetch(`${API_URL}/api/payments/${paymentId}`, {
        method: 'GET',
        headers: this.getHeaders(session)
      });

      if (!response.ok) {
        throw new Error('Failed to fetch payment details');
      }

      return await response.json();
    } catch (error: any) {
      console.error('Error fetching payment details:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update payment status
   */
  static async updatePaymentStatus(
    session: Session | null,
    paymentId: string,
    payment_status: string
  ) {
    try {
      const response = await fetch(`${API_URL}/api/payments/${paymentId}/status`, {
        method: 'PUT',
        headers: this.getHeaders(session),
        body: JSON.stringify({ payment_status })
      });

      if (!response.ok) {
        throw new Error('Failed to update payment status');
      }

      return await response.json();
    } catch (error: any) {
      console.error('Error updating payment status:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

