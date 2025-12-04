/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabaseProduct as supabase, supabase as supabaseClient } from '../lib/supabase';
import toast from 'react-hot-toast';
import { OrderService, Order } from '../services/orderService';
import { useSessionContext } from './sessionContext';
import API_URL from '../../config/api';
import { sendNotification } from '@tauri-apps/plugin-notification';

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
  const [adminContext, setAdminContext] = useState<{
    is_super_admin: boolean;
    role: string | null;
  }>({
    is_super_admin: false,
    role: null,
  });
  
  console.log('🔔 [Notifications] Provider rendered', { hasSession: !!session, isAuthenticated, notificationCount: notifications.length });
  
  // Store previous state for comparison
  const previousOrdersRef = useRef<Map<string, { status: string; payment_status: string; updated_at: string }>>(new Map());
  const previousProductsRef = useRef<Set<string>>(new Set());
  const welcomeNotifShownRef = useRef(false);

  // Check if user is regular admin (not super admin)
  const isRegularAdmin = adminContext.role === 'Admin' && !adminContext.is_super_admin;

  // Fetch admin context
  useEffect(() => {
    if (session?.user?.id) {
      fetch(`${API_URL}/api/admin/me`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setAdminContext({
              is_super_admin: data.is_super_admin === true,
              role: data.role || null,
            });
          }
        })
        .catch(error => {
          console.error('Failed to fetch admin context:', error);
          setAdminContext({ is_super_admin: false, role: null });
        });
    } else {
      setAdminContext({ is_super_admin: false, role: null });
    }
  }, [session]);

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
  const addNotification = async (notif: NotificationItem) => {
    // Filter: Regular admins should only see product and stock notifications
    if (isRegularAdmin && notif.type !== 'product' && notif.type !== 'stock') {
      return;
    }

    setNotifications((prev) => {
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
      const limited = updated.slice(0, 100);
      console.log('🔔 [Notifications] Total notifications:', limited.length);
      saveNotificationsToStorage(limited);
      return limited;
    });

    toast.success(notif.message, { duration: 3000 });

    if (notif.type === 'order' || notif.type === 'payment' || notif.type === 'product' || notif.type === 'stock') {
      try {
        await sendNotification({
          title: notif.title,
          body: notif.message,
          icon: '/izaj.png',
          sound: 'default',
        });
      } catch (error) {
        console.error('🔔 [Notifications] Error sending notification:', error);
      }
    }
  };

  const ordersInitializedRef = useRef(false);

  const checkOrdersAndPayments = async () => {
    if (!session || !isAuthenticated) {
      console.log('🔔 [Notifications] Skipping check - no session or not authenticated', { session: !!session, isAuthenticated });
      return;
    }

    // Regular admins should not receive order/payment notifications
    if (isRegularAdmin) {
      console.log('🔔 [Notifications] Skipping order/payment check - regular admin');
      return;
    }

    try {
      console.log('🔔 [Notifications] Checking orders and payments...');
      const result = await OrderService.getAllOrders(session, { skipAudit: true });
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
            const oldData = payload.old || {};
            const newData = payload.new || {};
            const productName = newData.product_name || oldData.product_name || 'Unknown Product';
            
            // Track which fields changed
            const changes: string[] = [];
            
            // Check quantity changes
            if (oldData.quantity !== undefined && newData.quantity !== undefined && oldData.quantity !== newData.quantity) {
              changes.push(`quantity: ${oldData.quantity} → ${newData.quantity}`);
              const newNotif: NotificationItem = {
                id: Date.now() + Math.random(),
                title: 'Product Quantity Updated',
                message: `${productName}: Quantity changed from ${oldData.quantity} to ${newData.quantity}. Click Sync to update stock.`,
                time: new Date().toLocaleTimeString(),
                read: false,
                type: 'stock',
              };
              addNotification(newNotif);
              return; // Return early for quantity changes as they're most important
            }
            
            // Check price changes
            if (oldData.price !== undefined && newData.price !== undefined && oldData.price !== newData.price) {
              changes.push(`price: ${oldData.price} → ${newData.price}`);
              const newNotif: NotificationItem = {
                id: Date.now() + Math.random(),
                title: 'Product Price Updated',
                message: `${productName}: Price changed from ₱${oldData.price} to ₱${newData.price}. Sync to update.`,
                time: new Date().toLocaleTimeString(),
                read: false,
                type: 'product',
              };
              addNotification(newNotif);
            }
            
            // Check product name changes
            if (oldData.product_name && newData.product_name && oldData.product_name !== newData.product_name) {
              changes.push(`name: "${oldData.product_name}" → "${newData.product_name}"`);
              const newNotif: NotificationItem = {
                id: Date.now() + Math.random(),
                title: 'Product Name Updated',
                message: `Product renamed from "${oldData.product_name}" to "${newData.product_name}". Sync to update.`,
                time: new Date().toLocaleTimeString(),
                read: false,
                type: 'product',
              };
              addNotification(newNotif);
            }
            
            // Check status changes
            if (oldData.status && newData.status && oldData.status !== newData.status) {
              changes.push(`status: ${oldData.status} → ${newData.status}`);
              const newNotif: NotificationItem = {
                id: Date.now() + Math.random(),
                title: 'Product Status Updated',
                message: `${productName}: Status changed from ${oldData.status} to ${newData.status}. Sync to update.`,
                time: new Date().toLocaleTimeString(),
                read: false,
                type: 'product',
              };
              addNotification(newNotif);
            }
            
            // Check category changes
            if (oldData.category !== undefined && newData.category !== undefined && oldData.category !== newData.category) {
              changes.push(`category: ${oldData.category} → ${newData.category}`);
              const newNotif: NotificationItem = {
                id: Date.now() + Math.random(),
                title: 'Product Category Updated',
                message: `${productName}: Category changed. Sync to update.`,
                time: new Date().toLocaleTimeString(),
                read: false,
                type: 'product',
              };
              addNotification(newNotif);
            }
            
            // Check branch changes
            if (oldData.branch !== undefined && newData.branch !== undefined && oldData.branch !== newData.branch) {
              changes.push(`branch: ${oldData.branch} → ${newData.branch}`);
              const newNotif: NotificationItem = {
                id: Date.now() + Math.random(),
                title: 'Product Branch Updated',
                message: `${productName}: Branch location changed. Sync to update.`,
                time: new Date().toLocaleTimeString(),
                read: false,
                type: 'product',
              };
              addNotification(newNotif);
            }
            
            // If no specific changes detected but update occurred, send general notification
            if (changes.length === 0) {
              const newNotif: NotificationItem = {
                id: Date.now() + Math.random(),
                title: 'Product Updated',
                message: `${productName} has been updated in centralized inventory. Sync to apply changes.`,
                time: new Date().toLocaleTimeString(),
                read: false,
                type: 'product',
              };
              addNotification(newNotif);
            }
          }
        );
      
      // Add DELETE listener for product removals
      const deleteChannel = supabase
        .channel('delete-centralized-product')
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'centralized_product',
          },
          (payload) => {
            const productName = payload.old?.product_name || 'Unknown Product';
            const newNotif: NotificationItem = {
              id: Date.now() + Math.random(),
              title: 'Product Removed',
              message: `${productName} has been removed from centralized inventory.`,
              time: new Date().toLocaleTimeString(),
              read: false,
              type: 'product',
            };
            addNotification(newNotif);
            // Remove from previous products set
            if (payload.old?.id) {
              previousProductsRef.current.delete(payload.old.id.toString());
            }
          }
        );

      const subscriptions = await Promise.all([
        insertChannel.subscribe(),
        stockUpdateChannel.subscribe(),
        updateChannel.subscribe(),
        deleteChannel.subscribe(),
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, session, adminContext]);



  // Filter notifications based on user role before providing to context
  const filteredNotifications = isRegularAdmin
    ? notifications.filter(n => n.type === 'product' || n.type === 'stock')
    : notifications;

  return (
    <NotificationsContext.Provider
      value={{
        notifications: filteredNotifications,
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