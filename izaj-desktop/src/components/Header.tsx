import { Icon } from '@iconify/react';
import { Session } from '@supabase/supabase-js';
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
          <div className="relative notification-container" style={{ overflow: 'visible' }}>
            <button 
              className="p-3 rounded-xl bg-white dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-amber-900/20 border border-gray-200 dark:border-slate-700 shadow-md hover:shadow-lg transition-all duration-300 relative group"
              onClick={toggleNotifications}
            >
              <Icon icon="mdi:bell-outline" className="w-6 h-6 text-gray-700 dark:text-slate-200 group-hover:text-gray-900 dark:group-hover:text-slate-100 transition-colors duration-300" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 dark:bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold shadow-lg animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            
            {notificationsOpen && (
              <div 
                className="absolute right-0 mt-4 w-96 bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-700 backdrop-blur-sm"
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 16px)',
                  right: '0',
                  zIndex: 101,
                  boxShadow: '0 20px 60px 0 rgba(0, 0, 0, 0.15)',
                }}
              >
                <div className="p-5 border-b border-gray-100 dark:border-slate-700 bg-gradient-to-r from-gray-50 to-white dark:from-slate-800 dark:to-slate-700 rounded-t-3xl">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-gray-900 dark:text-slate-100 text-lg" style={{ fontFamily: "'Jost', sans-serif" }}>Notifications</h3>
                    {unreadCount > 0 && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          markAllAsRead();
                        }}
                        className="text-sm text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200 font-semibold transition-colors hover:underline"
                        style={{ fontFamily: "'Jost', sans-serif" }}
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>
                </div>
                <div className="max-h-[75vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-slate-600 scrollbar-track-gray-100 dark:scrollbar-track-slate-800">
                  {notifications.length > 0 ? (
                    notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-5 border-b border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer transition-all duration-300 group ${
                          !notification.read ? 'bg-gray-50 dark:bg-slate-800/50 border-l-4 border-l-gray-900 dark:border-l-amber-400' : ''
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleNotificationClick(notification.id);
                        }}
                      >
                        <div className="flex items-start gap-4">
                          <div className={`p-2.5 rounded-xl ${
                            notification.type === 'order' ? 'bg-green-100 dark:bg-green-900/40 group-hover:bg-green-200 dark:group-hover:bg-green-900/60' :
                            notification.type === 'payment' ? 'bg-blue-100 dark:bg-blue-900/40 group-hover:bg-blue-200 dark:group-hover:bg-blue-900/60' :
                            'bg-yellow-100 dark:bg-yellow-900/40 group-hover:bg-yellow-200 dark:group-hover:bg-yellow-900/60'
                          } transition-colors duration-300`}>
                            <Icon 
                              icon={
                                notification.type === 'order' ? 'mdi:shopping-outline' :
                                notification.type === 'payment' ? 'mdi:credit-card-outline' :
                                'mdi:alert-outline'
                              }
                              className={`w-5 h-5 ${
                                notification.type === 'order' ? 'text-green-600 dark:text-green-400' :
                                notification.type === 'payment' ? 'text-blue-600 dark:text-blue-400' :
                                'text-yellow-600 dark:text-yellow-400'
                              }`}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 dark:text-slate-100 text-base truncate group-hover:text-gray-900 dark:group-hover:text-slate-50 transition-colors" style={{ fontFamily: "'Jost', sans-serif" }}>{notification.title}</p>
                            <p className="text-sm text-gray-600 dark:text-slate-400 truncate mt-1 group-hover:text-gray-700 dark:group-hover:text-slate-300 transition-colors" style={{ fontFamily: "'Jost', sans-serif" }}>{notification.message}</p>
                            <p className="text-xs text-gray-400 dark:text-slate-500 mt-2" style={{ fontFamily: "'Jost', sans-serif" }}>{notification.time}</p>
                          </div>
                          {!notification.read && (
                            <div className="w-2.5 h-2.5 rounded-full bg-gray-900 dark:bg-amber-400 flex-shrink-0 mt-1 animate-pulse"></div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-gray-500 dark:text-slate-400 text-base">
                      <Icon icon="mdi:bell-off-outline" className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-slate-600" />
                      <p className="text-lg" style={{ fontFamily: "'Jost', sans-serif" }}>No notifications</p>
                      <p className="text-sm text-gray-400 dark:text-slate-500 mt-1" style={{ fontFamily: "'Jost', sans-serif" }}>You're all caught up!</p>
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