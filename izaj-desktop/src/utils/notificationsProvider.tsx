/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabaseProduct as supabase, supabase as supabaseClient } from '../lib/supabase';
import toast from 'react-hot-toast';
import { OrderService, Order } from '../services/orderService';
import { useSessionContext } from './sessionContext';

interface NotificationItem {
  id: number;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: string;
}

interface NotificationsContextType {
  notifications: NotificationItem[];
  toggleNotifications: (e: React.MouseEvent) => void;
  notificationsOpen: boolean;
  handleNotificationClick: (id: number) => void;
  markAllAsRead: () => void;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationsContext);
  if (!context) throw new Error('useNotifications must be used within NotificationsProvider');
  return context;
};

interface NotificationsProviderProps {
  children: React.ReactNode;
  isAuthenticated?: boolean;
}

const NOTIFICATIONS_STORAGE_KEY = 'izaj_notifications';

// Load notifications from localStorage
const loadNotificationsFromStorage = (): NotificationItem[] => {
  try {
    const stored = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error loading notifications from storage:', error);
  }
  return [];
};

// Save notifications to localStorage
const saveNotificationsToStorage = (notifications: NotificationItem[]) => {
  try {
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications));
  } catch (error) {
    console.error('Error saving notifications to storage:', error);
  }
};

export const NotificationsProvider = ({ children, isAuthenticated = true }: NotificationsProviderProps) => {
  // Load notifications from localStorage on initial mount only
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    const loaded = loadNotificationsFromStorage();
    console.log('🔔 [Notifications] Loaded from storage:', loaded.length);
    return loaded;
  });
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const { session } = useSessionContext();
  
  console.log('🔔 [Notifications] Provider rendered', { hasSession: !!session, isAuthenticated, notificationCount: notifications.length });
  
  // Store previous state for comparison
  const previousOrdersRef = useRef<Map<string, { status: string; payment_status: string; updated_at: string }>>(new Map());
  const previousProductsRef = useRef<Set<string>>(new Set());
  const welcomeNotifShownRef = useRef(false);

  // Save notifications to localStorage whenever they change
  useEffect(() => {
    saveNotificationsToStorage(notifications);
  }, [notifications]);

  const toggleNotifications = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNotificationsOpen((prev) => !prev);
  };

  const handleNotificationClick = (id: number) => {
    setNotifications((prev) => {
      const updated = prev.map((n) => (n.id === id ? { ...n, read: true } : n));
      saveNotificationsToStorage(updated);
      return updated;
    });
  };

  const markAllAsRead = () => {
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, read: true }));
      saveNotificationsToStorage(updated);
      return updated;
    });
  };

  // Helper function to add notification
  const addNotification = (notif: NotificationItem) => {
    console.log('🔔 [Notifications] Adding notification:', notif);
    setNotifications((prev) => {
      // Check if notification already exists (prevent duplicates)
      const exists = prev.some(n => 
        n.message === notif.message && 
        n.title === notif.title &&
        Math.abs(new Date(n.time).getTime() - new Date(notif.time).getTime()) < 5000 // Within 5 seconds
      );
      
      if (exists) {
        console.log('🔔 [Notifications] Duplicate notification detected, skipping');
        return prev;
      }
      
      const updated = [notif, ...prev];
      // Keep only last 100 notifications to prevent storage bloat
      const limited = updated.slice(0, 100);
      console.log('🔔 [Notifications] Total notifications:', limited.length);
      saveNotificationsToStorage(limited);
      return limited;
    });
    toast.success(notif.message, { duration: 3000 });
  };

  // Track if we've initialized orders (to avoid notifying for all existing orders on first load)
  const ordersInitializedRef = useRef(false);

  // Polling function to check for order and payment changes
  const checkOrdersAndPayments = async () => {
    if (!session || !isAuthenticated) {
      console.log('🔔 [Notifications] Skipping check - no session or not authenticated', { session: !!session, isAuthenticated });
      return;
    }

    try {
      console.log('🔔 [Notifications] Checking orders and payments...');
      const result = await OrderService.getAllOrders(session);
      if (!result.success || !result.data) {
        console.log('🔔 [Notifications] No orders data returned', result);
        return;
      }

      const orders: Order[] = result.data;
      const currentOrdersMap = new Map<string, { status: string; payment_status: string; updated_at: string }>();

      // Initialize previous state on first load (don't notify for existing orders)
      if (!ordersInitializedRef.current) {
        console.log('🔔 [Notifications] Initializing orders state', orders.length);
        orders.forEach((order) => {
          currentOrdersMap.set(order.id, {
            status: order.status,
            payment_status: order.payment_status,
            updated_at: order.created_at,
          });
        });
        previousOrdersRef.current = currentOrdersMap;
        ordersInitializedRef.current = true;
        console.log('🔔 [Notifications] Orders initialized, will start monitoring changes');
        return; // Skip notification on first load
      }

      // Check for new orders and status changes
      orders.forEach((order) => {
        const orderId = order.id;
        const currentState = {
          status: order.status,
          payment_status: order.payment_status,
          updated_at: order.created_at,
        };
        currentOrdersMap.set(orderId, currentState);

        const previousState = previousOrdersRef.current.get(orderId);

        if (!previousState) {
          // New order (only notify if order was created recently - within last 5 minutes for better detection)
          const createdAt = new Date(order.created_at);
          const now = new Date();
          const diffMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60);
          
          if (diffMinutes < 5) {
            console.log('🔔 [Notifications] New order detected:', order.order_number);
            const newNotif: NotificationItem = {
              id: Date.now() + Math.random(),
              title: 'New Order Received',
              message: `Order #${order.order_number} has been placed.`,
              time: new Date().toLocaleTimeString(),
              read: false,
              type: 'order',
            };
            addNotification(newNotif);
          }
        } else {
          // Check for status changes
          if (previousState.status !== order.status) {
            console.log('🔔 [Notifications] Order status changed:', order.order_number, previousState.status, '->', order.status);
            const newNotif: NotificationItem = {
              id: Date.now() + Math.random(),
              title: 'Order Status Updated',
              message: `Order #${order.order_number} status changed to ${order.status.replace('_', ' ')}.`,
              time: new Date().toLocaleTimeString(),
              read: false,
              type: 'order',
            };
            addNotification(newNotif);
          }

          // Check for payment status changes
          if (previousState.payment_status !== order.payment_status) {
            console.log('🔔 [Notifications] Payment status changed:', order.order_number, previousState.payment_status, '->', order.payment_status);
            const paymentStatusLabels: Record<string, string> = {
              pending: 'Pending',
              paid: 'Paid',
              failed: 'Failed',
              refunded: 'Refunded',
            };

            const newNotif: NotificationItem = {
              id: Date.now() + Math.random(),
              title: 'Payment Status Updated',
              message: `Payment for Order #${order.order_number} is now ${paymentStatusLabels[order.payment_status] || order.payment_status}.`,
              time: new Date().toLocaleTimeString(),
              read: false,
              type: 'payment',
            };
            addNotification(newNotif);
          }
        }
      });

      // Update previous state
      previousOrdersRef.current = currentOrdersMap;
      console.log('🔔 [Notifications] Orders check completed');
    } catch (error) {
      console.error('❌ [Notifications] Error checking orders and payments:', error);
    }
  };

  // Polling function to check for product changes (using Supabase for now)
  const checkProducts = async () => {
    if (!isAuthenticated) return;

    try {
      // Check for new products
      const { data: products, error } = await supabase
        .from('centralized_product')
        .select('id, product_name, created_at')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching products:', error);
        return;
      }

      if (products) {
        products.forEach((product) => {
          const productId = product.id.toString();
          if (!previousProductsRef.current.has(productId)) {
            previousProductsRef.current.add(productId);
            
            // Only notify if product was created recently (within last 10 minutes for better detection)
            const createdAt = new Date(product.created_at);
            const now = new Date();
            const diffMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60);
            
            if (diffMinutes < 10) {
              const newNotif: NotificationItem = {
                id: Date.now() + Math.random(),
                title: 'New Product Added',
                message: `Product ${product.product_name} added to inventory.`,
                time: new Date().toLocaleTimeString(),
                read: false,
                type: 'product',
              };
              addNotification(newNotif);
            }
          }
        });
      }
    } catch (error) {
      console.error('Error checking products:', error);
    }
  };

  useEffect(() => {
    console.log('🔔 [Notifications] Setting up notification system', { isAuthenticated, hasSession: !!session });
    
    if (!isAuthenticated) {
      console.log('🔔 [Notifications] Not authenticated, skipping setup');
      return;
    }

    // Reset initialization when session becomes available
    if (session && !ordersInitializedRef.current) {
      console.log('🔔 [Notifications] Session available, will initialize on first check');
    }

    // Initial setup - keep Supabase realtime for products as fallback
    const setupProductRealtime = async () => {
      console.log('🔔 [Notifications] Setting up product realtime subscriptions');
      const insertChannel = supabase
        .channel('insert-centralized-product')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'centralized_product',
          },
          (payload) => {
            const newNotif: NotificationItem = {
              id: Date.now() + Math.random(),
              title: 'New Product Added',
              message: `Product ${payload.new.product_name} added to inventory.`,
              time: new Date().toLocaleTimeString(),
              read: false,
              type: 'product',
            };
            addNotification(newNotif);
            // Add to previous products set
            previousProductsRef.current.add(payload.new.id.toString());
          }
        );

      const stockUpdateChannel = supabaseClient
        .channel('update-product-stock')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'product_stock',
          },
          (payload) => {
            const oldQty = payload.old.current_quantity;
            const newQty = payload.new.current_quantity;

            if (oldQty !== newQty) {
              const newNotif: NotificationItem = {
                id: Date.now() + Math.random(),
                title: 'Stock Updated',
                message: `Updated stock for product ${payload.new.product_id}.`,
                time: new Date().toLocaleTimeString(),
                read: false,
                type: 'stock',
              };
              addNotification(newNotif);
            }
          }
        );

      const updateChannel = supabase
        .channel('update-centralized-product')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'centralized_product',
          },
          (payload) => {
            const newNotif: NotificationItem = {
              id: Date.now() + Math.random(),
              title: 'Product Updated',
              message: `Product ${payload.old.product_name} has been updated.`,
              time: new Date().toLocaleTimeString(),
              read: false,
              type: 'product',
            };
            addNotification(newNotif);
          }
        );

      const subscriptions = await Promise.all([
        insertChannel.subscribe(),
        stockUpdateChannel.subscribe(),
        updateChannel.subscribe(),
      ]);

      return () => {
        subscriptions.forEach((sub) => {
          supabase.removeChannel(sub);
          supabaseClient.removeChannel(sub);
        });
      };
    };

    // Setup product realtime
    const cleanupProductRealtime = setupProductRealtime();

    // Polling interval for orders and payments (every 5 seconds for faster detection)
    console.log('🔔 [Notifications] Starting polling intervals');
    const ordersPollInterval = setInterval(() => {
      checkOrdersAndPayments();
    }, 5000);

    // Polling interval for products (every 15 seconds as backup)
    const productsPollInterval = setInterval(() => {
      checkProducts();
    }, 15000);

    // Reset initialization when session changes
    if (session) {
      console.log('🔔 [Notifications] Session detected, resetting initialization');
      ordersInitializedRef.current = false;
      previousOrdersRef.current.clear();
      // Reset welcome notification flag when session changes (new login)
      welcomeNotifShownRef.current = false;
    }

    // Initial check
    console.log('🔔 [Notifications] Running initial checks...');
    
    // Add a welcome notification to verify system is working (only once per session)
    if (!welcomeNotifShownRef.current && session) {
      welcomeNotifShownRef.current = true;
      setTimeout(() => {
        // Check if welcome notification already exists in localStorage
        const stored = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
        let hasWelcomeNotif = false;
        
        if (stored) {
          try {
            const storedNotifications = JSON.parse(stored);
            hasWelcomeNotif = storedNotifications.some((n: NotificationItem) => 
              n.title === 'Notification System Active'
            );
          } catch (error) {
            console.error('Error checking stored notifications:', error);
          }
        }
        
        // Also check current notifications state
        if (!hasWelcomeNotif) {
          hasWelcomeNotif = notifications.some(n => 
            n.title === 'Notification System Active'
          );
        }
        
        if (!hasWelcomeNotif) {
          const welcomeNotif: NotificationItem = {
            id: Date.now() + Math.random(),
            title: 'Notification System Active',
            message: 'Notifications are now active. You will be notified of new orders, payments, and product updates.',
            time: new Date().toLocaleTimeString(),
            read: false,
            type: 'product',
          };
          addNotification(welcomeNotif);
        }
      }, 1000);
    }
    
    checkOrdersAndPayments();
    checkProducts();

    return () => {
      clearInterval(ordersPollInterval);
      clearInterval(productsPollInterval);
      cleanupProductRealtime.then((cleanup) => cleanup?.());
    };
  }, [isAuthenticated, session]);



  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        toggleNotifications,
        notificationsOpen,
        handleNotificationClick,
        markAllAsRead,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
};