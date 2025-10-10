import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabaseProduct as supabase, supabase as supabaseClient } from '../lib/supabase';
import toast from 'react-hot-toast';

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

export const NotificationsProvider = ({ children }: { children: React.ReactNode }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const toggleNotifications = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNotificationsOpen((prev) => !prev);
  };

  const handleNotificationClick = (id: number) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  useEffect(() => {
    const setupRealtime = async () => {
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
              id: Date.now(),
              title: 'New Product Added',
              message: `Product ${payload.new.product_name} added to inventory.`,
              time: new Date().toLocaleTimeString(),
              read: false,
              type: 'product',
            };
            setNotifications((prev) => [newNotif, ...prev]);
            toast.success(newNotif.message);
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
                id: Date.now(),
                title: 'Stock Updated',
                message: `Updated stock for product ${payload.new.product_id}.`,
                time: new Date().toLocaleTimeString(),
                read: false,
                type: 'stock',
              };
              setNotifications((prev) => [newNotif, ...prev]);
              toast.success(newNotif.message);
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
              id: Date.now(),
              title: 'Product Updated',
              message: `Product ${payload.old.product_name} Updated.`,
              time: new Date().toLocaleTimeString(),
              read: false,
              type: 'product',
            };
            setNotifications((prev) => [newNotif, ...prev]);
            toast.error(newNotif.message);
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

    setupRealtime();
  }, []);



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