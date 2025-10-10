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
      className={`bg-white shadow-2xl border border-white
        px-3 sm:px-6 md:px-8 py-2 sm:py-3 rounded-none sm:rounded-2xl shrink-0 transition-all duration-300
        backdrop-blur-md mb-2 sm:mb-4 mt-2
        ${sidebarCollapsed ? 'mx-0 sm:mx-2' : 'mx-0 sm:mx-4 md:mx-8'}
      `}
      style={{
        borderLeft: '6px solid #fff',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
        height: 'auto',
        minHeight: '60px',
        position: 'relative',
        zIndex: 40
      }}
    >
      <div className="flex items-center justify-between gap-2 sm:gap-4">
        {/* Menu */}
        <div className="flex items-center gap-2 sm:gap-4 flex-1">
          <button
            className="p-1.5 sm:p-2 rounded-lg bg-white hover:bg-yellow-50 border border-yellow-50 shadow transition lg:hidden"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Icon icon="mdi:menu" className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
          </button>
          <button
            className="p-1.5 sm:p-2 rounded-lg bg-white hover:bg-yellow-50 border border-yellow-50 shadow transition hidden lg:block"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            <Icon icon="mdi:menu" className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
          </button>

        </div>
        {/* Notification */}
        <div className="flex items-center gap-1.5 sm:gap-4">
          <div className="relative notification-container" style={{ overflow: 'visible' }}>
            <button 
              className="p-1.5 sm:p-2 rounded-lg bg-white hover:bg-yellow-100 border border-yellow-100 shadow transition relative"
              onClick={toggleNotifications}
            >
              <Icon icon="mdi:bell-outline" className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center text-[10px] sm:text-xs">
                  {unreadCount}
                </span>
              )}
            </button>
            
            {notificationsOpen && (
              <div 
                className="absolute right-0 mt-2 w-[280px] sm:w-80 bg-white rounded-xl shadow-lg border border-gray-100"
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 10px)',
                  right: '0',
                  zIndex: 101
                }}
              >
                <div className="p-3 sm:p-4 border-b border-gray-100">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-gray-800 text-sm sm:text-base">Notifications</h3>
                    {unreadCount > 0 && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          markAllAsRead();
                        }}
                        className="text-xs sm:text-sm text-blue-600 hover:text-blue-800"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>
                </div>
                <div className="max-h-[60vh] sm:max-h-96 overflow-y-auto scrollbar-none">
                  {notifications.length > 0 ? (
                    notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-3 sm:p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                          !notification.read ? 'bg-blue-50' : ''
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleNotificationClick(notification.id);
                        }}
                      >
                        <div className="flex items-start gap-2 sm:gap-3">
                          <div className={`p-1.5 sm:p-2 rounded-lg ${
                            notification.type === 'order' ? 'bg-green-100' :
                            notification.type === 'payment' ? 'bg-blue-100' :
                            'bg-yellow-100'
                          }`}>
                            <Icon 
                              icon={
                                notification.type === 'order' ? 'mdi:shopping-outline' :
                                notification.type === 'payment' ? 'mdi:credit-card-outline' :
                                'mdi:alert-outline'
                              }
                              className={`w-4 h-4 sm:w-5 sm:h-5 ${
                                notification.type === 'order' ? 'text-green-600' :
                                notification.type === 'payment' ? 'text-blue-600' :
                                'text-yellow-600'
                              }`}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-800 text-sm sm:text-base truncate">{notification.title}</p>
                            <p className="text-xs sm:text-sm text-gray-600 truncate">{notification.message}</p>
                            <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5 sm:mt-1">{notification.time}</p>
                          </div>
                          {!notification.read && (
                            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-blue-500 flex-shrink-0"></div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-gray-500 text-sm sm:text-base">
                      No notifications
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