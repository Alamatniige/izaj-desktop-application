/**
 * Order Services for orders.tsx page
 * Frontend hooks and utilities for order management
 */

import { useState, useEffect, useCallback } from 'react';
import { OrderService, Order } from './orderService';

interface OrderStats {
  pending: number;
  approved: number;
  in_transit: number;
  complete: number;
  cancelled: number;
}

export const useOrders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<OrderStats>({
    pending: 0,
    approved: 0,
    in_transit: 0,
    complete: 0,
    cancelled: 0
  });

  const fetchOrders = useCallback(async () => {
    console.log('🔵 [useOrders] Fetching orders...');
    setIsLoading(true);
    try {
      const result = await OrderService.getAllOrders();
      console.log('🔵 [useOrders] Result:', result);

      if (result.success && result.data) {
        console.log('✅ [useOrders] Orders loaded:', result.data.length);
        setOrders(result.data);
        
        // Calculate stats
        const newStats = {
          pending: result.data.filter(o => o.status === 'pending').length,
          approved: result.data.filter(o => o.status === 'approved').length,
          in_transit: result.data.filter(o => o.status === 'in_transit').length,
          complete: result.data.filter(o => o.status === 'complete').length,
          cancelled: result.data.filter(o => o.status === 'cancelled').length,
        };
        console.log('📊 [useOrders] Stats:', newStats);
        setStats(newStats);
      } else {
        console.error('❌ [useOrders] Failed to load orders:', result.error);
      }
    } catch (error) {
      console.error('❌ [useOrders] Error fetching orders:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return {
    orders,
    isLoading,
    stats,
    refetchOrders: fetchOrders
  };
};

export const useOrderActions = (onSuccess?: () => void) => {
  const [isUpdating, setIsUpdating] = useState(false);

  const updateStatus = useCallback(async (
    orderId: string,
    newStatus: string,
    options?: any
  ) => {
    setIsUpdating(true);
    try {
      const result = await OrderService.updateOrderStatus(orderId, newStatus, options);
      
      if (result.success) {
        onSuccess?.();
      }
      
      return result;
    } catch (error) {
      console.error('Error updating status:', error);
      return { success: false, error: 'Failed to update status' };
    } finally {
      setIsUpdating(false);
    }
  }, [onSuccess]);

  const approveOrder = useCallback(async (orderId: string, adminNotes?: string) => {
    return await updateStatus(orderId, 'approved', { admin_notes: adminNotes });
  }, [updateStatus]);

  const markAsInTransit = useCallback(async (
    orderId: string,
    trackingNumber: string,
    courier: string
  ) => {
    return await OrderService.markAsInTransit(orderId, trackingNumber, courier)
      .then(result => {
        if (result.success) onSuccess?.();
        return result;
      });
  }, [onSuccess]);

  const markAsComplete = useCallback(async (orderId: string) => {
    return await updateStatus(orderId, 'complete');
  }, [updateStatus]);

  const cancelOrder = useCallback(async (orderId: string, reason: string) => {
    setIsUpdating(true);
    try {
      const result = await OrderService.cancelOrder(orderId, reason);
      
      if (result.success) {
        onSuccess?.();
      }
      
      return result;
    } catch (error) {
      console.error('Error cancelling order:', error);
      return { success: false, error: 'Failed to cancel order' };
    } finally {
      setIsUpdating(false);
    }
  }, [onSuccess]);

  return {
    isUpdating,
    updateStatus,
    approveOrder,
    markAsInTransit,
    markAsComplete,
    cancelOrder
  };
};

// Helper functions
export const formatOrderDate = (dateString: string) => {
  return new Date(dateString).toLocaleString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const formatPrice = (price: number) => {
  return `₱${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending':
      return 'bg-yellow-400 hover:bg-yellow-500';
    case 'approved':
      return 'bg-blue-500 hover:bg-blue-600';
    case 'in_transit':
      return 'bg-purple-500 hover:bg-purple-600';
    case 'complete':
      return 'bg-green-500 hover:bg-green-600';
    case 'cancelled':
      return 'bg-red-500 hover:bg-red-600';
    default:
      return 'bg-gray-400 hover:bg-gray-500';
  }
};

