/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Order Services for orders.tsx page
 * Frontend hooks and utilities for order management
 */

import { useState, useEffect, useCallback } from 'react';
import { Session } from '@supabase/supabase-js';
import { OrderService, Order } from './orderService';

interface OrderStats {
  pending: number;
  approved: number;
  in_transit: number;
  complete: number;
  cancelled: number;
  pending_cancellation?: number;
}

export const useOrders = (session: Session | null) => {
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
    setIsLoading(true);
    try {
      const result = await OrderService.getAllOrders(session);

      if (result.success && result.data) {
        setOrders(result.data);
        
        // Calculate stats
        const newStats = {
          pending: result.data.filter((o: { status: string; }) => o.status === 'pending').length,
          approved: result.data.filter((o: { status: string; }) => o.status === 'approved').length,
          in_transit: result.data.filter((o: { status: string; }) => o.status === 'in_transit').length,
          complete: result.data.filter((o: { status: string; }) => o.status === 'complete').length,
          cancelled: result.data.filter((o: { status: string; }) => o.status === 'cancelled').length,
          pending_cancellation: result.data.filter((o: { status: string; }) => o.status === 'pending_cancellation').length,
        };
        setStats(newStats);
      } else {
        console.error('Failed to load orders:', result.error);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setIsLoading(false);
    }
  }, [session]);

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

export const useOrderActions = (session: Session | null, onSuccess?: () => void) => {
  const [isUpdating, setIsUpdating] = useState(false);

  const updateStatus = useCallback(async (
    orderId: string,
    newStatus: string,
    options?: any
  ) => {
    setIsUpdating(true);
    try {
      const result = await OrderService.updateOrderStatus(session, orderId, newStatus, options);
      
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
  }, [session, onSuccess]);

  const approveOrder = useCallback(async (orderId: string, adminNotes?: string) => {
    return await updateStatus(orderId, 'approved', { admin_notes: adminNotes });
  }, [updateStatus]);

  const markAsInTransit = useCallback(async (
    orderId: string,
    trackingNumber: string,
    courier: string
  ) => {
    return await OrderService.markAsInTransit(session, orderId, trackingNumber, courier)
      .then(result => {
        if (result.success) onSuccess?.();
        return result;
      });
  }, [session, onSuccess]);

  const markAsComplete = useCallback(async (orderId: string) => {
    return await updateStatus(orderId, 'complete');
  }, [updateStatus]);

  const cancelOrder = useCallback(async (orderId: string, reason: string) => {
    setIsUpdating(true);
    try {
      const result = await OrderService.cancelOrder(session, orderId, reason);
      
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
  }, [session, onSuccess]);

  const approveCancellation = useCallback(async (orderId: string, reason: string) => {
    setIsUpdating(true);
    try {
      const result = await OrderService.approveCancellation(session, orderId, reason);
      
      if (result.success) {
        onSuccess?.();
      }
      
      return result;
    } catch (error) {
      console.error('Error approving cancellation:', error);
      return { success: false, error: 'Failed to approve cancellation' };
    } finally {
      setIsUpdating(false);
    }
  }, [session, onSuccess]);

  const declineCancellation = useCallback(async (orderId: string) => {
    setIsUpdating(true);
    try {
      const result = await OrderService.declineCancellation(session, orderId);
      
      if (result.success) {
        onSuccess?.();
      }
      
      return result;
    } catch (error) {
      console.error('Error declining cancellation:', error);
      return { success: false, error: 'Failed to decline cancellation' };
    } finally {
      setIsUpdating(false);
    }
  }, [session, onSuccess]);

  return {
    isUpdating,
    updateStatus,
    approveOrder,
    markAsInTransit,
    markAsComplete,
    cancelOrder,
    approveCancellation,
    declineCancellation
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

