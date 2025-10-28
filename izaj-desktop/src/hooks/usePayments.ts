import { useState, useEffect, useCallback } from 'react';
import { Session } from '@supabase/supabase-js';
import { toast } from 'react-hot-toast';
import { PaymentService, Payment, PaymentStats } from '../services/paymentService';

export const usePayments = (session: Session | null) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 0 });
  const [filters, setFilters] = useState<{
    search?: string;
    status?: string;
    payment_method?: string;
  }>({});

  const fetchPayments = useCallback(async () => {
    if (!session) {
      console.log('⚠️ No session available, skipping payments fetch');
      setIsLoading(false);
      return;
    }

    try {
      console.log('🚀 Fetching payments...');
      setIsLoading(true);
      const response = await PaymentService.getAllPayments(session, currentPage, 10, filters);
      
      console.log('📦 Payments response:', response);
      
      if (response.success) {
        console.log('✅ Payments fetched successfully:', response.payments?.length || 0, 'payments');
        setPayments(response.payments || []);
        setPagination(response.pagination);
      } else {
        console.error('❌ Failed to load payments:', response.error);
        toast.error('Failed to load payments');
      }
    } catch (error) {
      console.error('❌ Error fetching payments:', error);
      toast.error('Failed to load payments');
    } finally {
      setIsLoading(false);
    }
  }, [session, currentPage, filters]);

  const fetchStats = useCallback(async () => {
    if (!session) {
      console.log('⚠️ No session available, skipping stats fetch');
      return;
    }

    try {
      console.log('🚀 Fetching payment stats...');
      const response = await PaymentService.getPaymentStats(session);
      console.log('📦 Stats response:', response);
      
      if (response.success) {
        console.log('✅ Stats fetched successfully:', response.stats);
        setStats(response.stats);
      } else {
        console.error('❌ Failed to load stats:', response.error);
      }
    } catch (error) {
      console.error('❌ Error fetching payment stats:', error);
    }
  }, [session]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const refetchPayments = useCallback(() => {
    fetchPayments();
    fetchStats();
  }, [fetchPayments, fetchStats]);

  const updateFilters = useCallback((newFilters: typeof filters) => {
    setFilters(newFilters);
    setCurrentPage(1); // Reset to first page when filters change
  }, []);

  return {
    payments,
    stats,
    isLoading,
    currentPage,
    pagination,
    filters,
    setCurrentPage,
    updateFilters,
    refetchPayments
  };
};

export const usePaymentActions = (refetch: () => void) => {
  const [isUpdating, setIsUpdating] = useState(false);

  const updatePaymentStatus = useCallback(async (
    session: Session | null,
    paymentId: string,
    payment_status: string
  ) => {
    if (!session) {
      toast.error('Not authenticated');
      return { success: false };
    }

    try {
      setIsUpdating(true);
      const result = await PaymentService.updatePaymentStatus(session, paymentId, payment_status);
      
      if (result.success) {
        toast.success(`Payment status updated to ${payment_status}`);
        refetch();
        return { success: true };
      } else {
        toast.error(result.error || 'Failed to update payment status');
        return { success: false };
      }
    } catch (error: any) {
      console.error('Error updating payment status:', error);
      toast.error('Failed to update payment status');
      return { success: false };
    } finally {
      setIsUpdating(false);
    }
  }, [refetch]);

  return {
    isUpdating,
    updatePaymentStatus
  };
};

// Helper functions
export const formatPaymentDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    month: '2-digit', 
    day: '2-digit', 
    year: '2-digit' 
  });
};

export const formatPaymentTime = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false
  });
};

export const formatPrice = (amount: number | string) => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  return `₱${numAmount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const getPaymentStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    paid: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
    refunded: 'bg-blue-100 text-blue-700'
  };
  return colors[status.toLowerCase()] || 'bg-gray-100 text-gray-700';
};

export const getPaymentMethodLabel = (method: string) => {
  const labels: Record<string, string> = {
    gcash: 'GCash',
    maya: 'Maya',
    cod: 'Cash on Delivery',
    bank_transfer: 'Bank Transfer'
  };
  return labels[method.toLowerCase()] || method;
};
