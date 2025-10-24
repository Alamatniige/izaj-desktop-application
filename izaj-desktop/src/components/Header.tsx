import { Icon } from '@iconify/react';
import { Session } from '@supabase/supabase-js';
import { useNotifications } from '../utils/notificationsProvider';

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

  const unreadCount = notifications.filter(n => !n.read).length;
  return (
    <header
      className={`border-b border-gray-100 shadow-lg bg-gradient-to-r from-white via-gray-50 to-white
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
            className="p-2.5 rounded-xl bg-white hover:bg-gray-100 border border-gray-200 shadow-md hover:shadow-lg transition-all duration-200 active:scale-95 lg:hidden"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Icon icon="mdi:menu" className="w-6 h-6 text-gray-700" />
          </button>
          <button
            className="p-3 rounded-xl bg-white hover:bg-gray-100 border border-gray-200 shadow-md hover:shadow-lg transition-all duration-300 hidden lg:block group"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            <Icon 
              icon="mdi:menu" 
              className={`w-6 h-6 text-gray-700 group-hover:text-gray-900 transition-all duration-300 ${
                sidebarCollapsed ? 'rotate-180' : 'rotate-0'
              }`} 
            />
          </button>

        </div>
        {/* Notification */}
        <div className="flex items-center gap-4">
          <div className="relative notification-container" style={{ overflow: 'visible' }}>
            <button 
              className="p-3 rounded-xl bg-white hover:bg-gray-100 border border-gray-200 shadow-md hover:shadow-lg transition-all duration-300 relative group"
              onClick={toggleNotifications}
            >
              <Icon icon="mdi:bell-outline" className="w-6 h-6 text-gray-700 group-hover:text-gray-900 transition-colors duration-300" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center text-xs font-semibold shadow-lg animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            
            {notificationsOpen && (
              <div 
                className="absolute right-0 mt-4 w-96 bg-white rounded-3xl shadow-2xl border border-gray-100 backdrop-blur-sm"
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 16px)',
                  right: '0',
                  zIndex: 101,
                  boxShadow: '0 20px 60px 0 rgba(0, 0, 0, 0.15)',
                }}
              >
                <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white rounded-t-3xl">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-gray-900 text-lg" style={{ fontFamily: "'Jost', sans-serif" }}>Notifications</h3>
                    {unreadCount > 0 && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          markAllAsRead();
                        }}
                        className="text-sm text-gray-600 hover:text-gray-900 font-semibold transition-colors hover:underline"
                        style={{ fontFamily: "'Jost', sans-serif" }}
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>
                </div>
                <div className="max-h-[75vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                  {notifications.length > 0 ? (
                    notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-5 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-all duration-300 group ${
                          !notification.read ? 'bg-gray-50 border-l-4 border-l-gray-900' : ''
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleNotificationClick(notification.id);
                        }}
                      >
                        <div className="flex items-start gap-4">
                          <div className={`p-2.5 rounded-xl ${
                            notification.type === 'order' ? 'bg-green-100 group-hover:bg-green-200' :
                            notification.type === 'payment' ? 'bg-blue-100 group-hover:bg-blue-200' :
                            'bg-yellow-100 group-hover:bg-yellow-200'
                          } transition-colors duration-300`}>
                            <Icon 
                              icon={
                                notification.type === 'order' ? 'mdi:shopping-outline' :
                                notification.type === 'payment' ? 'mdi:credit-card-outline' :
                                'mdi:alert-outline'
                              }
                              className={`w-5 h-5 ${
                                notification.type === 'order' ? 'text-green-600' :
                                notification.type === 'payment' ? 'text-blue-600' :
                                'text-yellow-600'
                              }`}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 text-base truncate group-hover:text-gray-900 transition-colors" style={{ fontFamily: "'Jost', sans-serif" }}>{notification.title}</p>
                            <p className="text-sm text-gray-600 truncate mt-1 group-hover:text-gray-700 transition-colors" style={{ fontFamily: "'Jost', sans-serif" }}>{notification.message}</p>
                            <p className="text-xs text-gray-400 mt-2" style={{ fontFamily: "'Jost', sans-serif" }}>{notification.time}</p>
                          </div>
                          {!notification.read && (
                            <div className="w-2.5 h-2.5 rounded-full bg-gray-900 flex-shrink-0 mt-1 animate-pulse"></div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-gray-500 text-base">
                      <Icon icon="mdi:bell-off-outline" className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                      <p className="text-lg" style={{ fontFamily: "'Jost', sans-serif" }}>No notifications</p>
                      <p className="text-sm text-gray-400 mt-1" style={{ fontFamily: "'Jost', sans-serif" }}>You're all caught up!</p>
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