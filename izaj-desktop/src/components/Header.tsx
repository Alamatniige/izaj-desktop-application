import { Icon } from '@iconify/react';
import { Session } from '@supabase/supabase-js';
import { useEffect, useRef } from 'react';
import { useNotifications } from '../utils/notificationsProvider';
import { useDarkMode } from '../utils/darkModeProvider';

interface HeaderProps {
  session: Session | null;
  sidebarCollapsed: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;

  // Notifications
  notifications: Array<{
    id: number;
    title: string;
    message: string;
    time: string;
    read: boolean;
    type: string;
  }>;
  notificationsOpen: boolean;
  toggleNotifications: (e: React.MouseEvent) => void;
  handleNotificationClick: (id: number) => void;
  markAllAsRead: () => void;
}


const Header = ({
  sidebarCollapsed,
  setMobileMenuOpen,
  setSidebarCollapsed,
}:

HeaderProps) => {
  const {
    notifications,
    notificationsOpen,
    toggleNotifications,
    handleNotificationClick,
    markAllAsRead,
  } = useNotifications();

  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const unreadCount = notifications.filter(n => !n.read).length;
  const notificationRef = useRef<HTMLDivElement>(null);

  // Close notification dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsOpen && notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        // Close the notification dropdown
        const syntheticEvent = {
          stopPropagation: () => {},
        } as React.MouseEvent;
        toggleNotifications(syntheticEvent);
      }
    };

    if (notificationsOpen) {
      // Use a small delay to avoid closing immediately when opening
      const timeoutId = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 100);

      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [notificationsOpen, toggleNotifications]);

  return (
    <header
      className={`border-b border-gray-100 dark:border-slate-800 shadow-lg bg-gradient-to-r from-white via-gray-50 to-white dark:from-slate-950 dark:via-slate-900 dark:to-slate-950
        px-6 lg:px-8 py-4 shrink-0 transition-all duration-300
      `}
      style={{
        height: 'auto',
        minHeight: '72px',
        position: 'relative',
        zIndex: 40
      }}
    >
      <div className="flex items-center justify-between gap-2 sm:gap-4">
        {/* Menu */}
        <div className="flex items-center gap-4 flex-1">
          <button
            className="p-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-amber-900/20 border border-gray-200 dark:border-slate-700 shadow-md hover:shadow-lg transition-all duration-200 active:scale-95 lg:hidden"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Icon icon="mdi:menu" className="w-6 h-6 text-gray-700 dark:text-slate-200" />
          </button>
          <button
            className="p-3 rounded-xl bg-white dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-amber-900/20 border border-gray-200 dark:border-slate-700 shadow-md hover:shadow-lg transition-all duration-300 hidden lg:block group"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            <Icon 
              icon="mdi:menu" 
              className={`w-6 h-6 text-gray-700 dark:text-slate-200 group-hover:text-gray-900 dark:group-hover:text-slate-100 transition-all duration-300 ${
                sidebarCollapsed ? 'rotate-180' : 'rotate-0'
              }`} 
            />
          </button>

        </div>
        {/* Dark Mode Toggle & Notification */}
        <div className="flex items-center gap-4">
          {/* Dark Mode Toggle */}
          <button 
            className="p-3 rounded-xl bg-white dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-amber-900/20 border border-gray-200 dark:border-slate-700 shadow-md hover:shadow-lg transition-all duration-300 relative group"
            onClick={() => toggleDarkMode()}
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            <Icon 
              icon={isDarkMode ? "mdi:weather-sunny" : "mdi:weather-night"} 
              className="w-6 h-6 text-gray-700 dark:text-amber-300 group-hover:text-gray-900 dark:group-hover:text-amber-200 transition-colors duration-300" 
            />
          </button>

          {/* Notification */}
          <div ref={notificationRef} className="relative notification-container" style={{ overflow: 'visible' }}>
            <button 
              className="p-3 rounded-xl bg-white dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-amber-900/20 border border-gray-200 dark:border-slate-700 shadow-md hover:shadow-lg transition-all duration-300 relative group"
              onClick={toggleNotifications}
            >
              <Icon 
                icon={notificationsOpen ? "mdi:bell" : "mdi:bell-outline"} 
                className={`w-6 h-6 text-gray-700 dark:text-slate-200 group-hover:text-gray-900 dark:group-hover:text-slate-100 transition-all duration-300 ${
                  notificationsOpen ? 'text-amber-600 dark:text-amber-400' : ''
                }`} 
              />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-gradient-to-br from-red-500 to-red-600 dark:from-red-600 dark:to-red-700 text-white text-[10px] font-bold rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center shadow-lg ring-2 ring-white dark:ring-slate-800 animate-pulse">
                  {unreadCount > 99 ? '99+' : unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            
            {notificationsOpen && (
              <div 
                className="absolute right-0 mt-4 w-[420px] bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-200/50 dark:border-slate-700/50 backdrop-blur-xl overflow-hidden transform transition-all duration-300 ease-out"
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 12px)',
                  right: '0',
                  zIndex: 101,
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)',
                }}
              >
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700/50 bg-gradient-to-r from-gray-50/50 via-white to-gray-50/50 dark:from-slate-800 dark:via-slate-800 dark:to-slate-800">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-gradient-to-br from-amber-400 to-amber-500 dark:from-amber-500 dark:to-amber-600 shadow-sm">
                        <Icon icon="mdi:bell" className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 dark:text-slate-100 text-lg leading-tight" style={{ fontFamily: "'Jost', sans-serif" }}>
                          Notifications
                        </h3>
                        {unreadCount > 0 && (
                          <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5" style={{ fontFamily: "'Jost', sans-serif" }}>
                            {unreadCount} unread{unreadCount > 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                    </div>
                    {unreadCount > 0 && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          markAllAsRead();
                        }}
                        className="px-3 py-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-all duration-200"
                        style={{ fontFamily: "'Jost', sans-serif" }}
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                </div>

                {/* Notifications List */}
                <div className="max-h-[75vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent hover:scrollbar-thumb-gray-400 dark:hover:scrollbar-thumb-slate-500">
                  {notifications.length > 0 ? (
                    <div className="divide-y divide-gray-100 dark:divide-slate-700/50">
                      {notifications.map((notification, index) => (
                        <div
                          key={notification.id}
                          className={`px-6 py-4 hover:bg-gradient-to-r hover:from-gray-50/50 hover:to-transparent dark:hover:from-slate-700/30 dark:hover:to-transparent cursor-pointer transition-all duration-200 group relative ${
                            !notification.read 
                              ? 'bg-gradient-to-r from-amber-50/30 via-white to-white dark:from-amber-900/10 dark:via-slate-800 dark:to-slate-800 border-l-4 border-l-amber-400 dark:border-l-amber-500' 
                              : 'bg-white dark:bg-slate-800 border-l-4 border-l-transparent'
                          }`}
                          style={{
                            animationDelay: `${index * 50}ms`,
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNotificationClick(notification.id);
                          }}
                        >
                          <div className="flex items-start gap-4">
                            {/* Icon Container */}
                            <div className={`flex-shrink-0 p-3 rounded-xl shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md ${
                              notification.type === 'order' 
                                ? 'bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/40 dark:to-green-800/40 group-hover:from-green-200 group-hover:to-green-300 dark:group-hover:from-green-900/60 dark:group-hover:to-green-800/60' :
                              notification.type === 'payment' 
                                ? 'bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/40 dark:to-blue-800/40 group-hover:from-blue-200 group-hover:to-blue-300 dark:group-hover:from-blue-900/60 dark:group-hover:to-blue-800/60' :
                              notification.type === 'product' || notification.type === 'stock'
                                ? 'bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/40 dark:to-purple-800/40 group-hover:from-purple-200 group-hover:to-purple-300 dark:group-hover:from-purple-900/60 dark:group-hover:to-purple-800/60' :
                                'bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/40 dark:to-amber-800/40 group-hover:from-amber-200 group-hover:to-amber-300 dark:group-hover:from-amber-900/60 dark:group-hover:to-amber-800/60'
                            }`}>
                              <Icon 
                                icon={
                                  notification.type === 'order' ? 'mdi:shopping' :
                                  notification.type === 'payment' ? 'mdi:credit-card' :
                                  notification.type === 'product' ? 'mdi:package-variant' :
                                  notification.type === 'stock' ? 'mdi:package-variant-closed' :
                                  'mdi:information'
                                }
                                className={`w-5 h-5 ${
                                  notification.type === 'order' ? 'text-green-600 dark:text-green-400' :
                                  notification.type === 'payment' ? 'text-blue-600 dark:text-blue-400' :
                                  notification.type === 'product' || notification.type === 'stock' ? 'text-purple-600 dark:text-purple-400' :
                                  'text-amber-600 dark:text-amber-400'
                                }`}
                              />
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-gray-900 dark:text-slate-100 text-[15px] leading-snug group-hover:text-gray-950 dark:group-hover:text-slate-50 transition-colors" style={{ fontFamily: "'Jost', sans-serif" }}>
                                    {notification.title}
                                  </p>
                                  <p className="text-sm text-gray-600 dark:text-slate-400 leading-relaxed mt-1.5 group-hover:text-gray-700 dark:group-hover:text-slate-300 transition-colors overflow-hidden text-ellipsis" style={{ fontFamily: "'Jost', sans-serif", display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                                    {notification.message}
                                  </p>
                                  <div className="flex items-center gap-2 mt-2.5">
                                    <Icon icon="mdi:clock-outline" className="w-3.5 h-3.5 text-gray-400 dark:text-slate-500" />
                                    <p className="text-xs text-gray-400 dark:text-slate-500 font-medium" style={{ fontFamily: "'Jost', sans-serif" }}>
                                      {notification.time}
                                    </p>
                                  </div>
                                </div>
                                
                                {/* Unread Indicator */}
                                {!notification.read && (
                                  <div className="flex-shrink-0 mt-1">
                                    <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-amber-400 to-amber-500 dark:from-amber-500 dark:to-amber-600 shadow-sm animate-pulse"></div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="px-6 py-16 text-center">
                      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-slate-700 dark:to-slate-800 mb-4">
                        <Icon icon="mdi:bell-off-outline" className="w-10 h-10 text-gray-400 dark:text-slate-500" />
                      </div>
                      <p className="text-lg font-semibold text-gray-700 dark:text-slate-300 mb-1.5" style={{ fontFamily: "'Jost', sans-serif" }}>
                        No notifications
                      </p>
                      <p className="text-sm text-gray-500 dark:text-slate-400" style={{ fontFamily: "'Jost', sans-serif" }}>
                        You're all caught up! 🎉
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header; 