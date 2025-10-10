import { useState, useRef, useEffect } from 'react';
import { Icon } from '@iconify/react';

interface User {
  firstName: string;
  lastName: string;
  email: string;
}

interface Notification {
  id: number;
  type: 'order' | 'promo' | 'review' | 'system' | 'favorite';
  message: string;
  time: string;
  isRead: boolean;
  link?: string;
}

interface NotificationDropdownProps {
  user: User | null;
  onOpenAuthModal: () => void;
}

export default function NotificationDropdown({ user, onOpenAuthModal }: NotificationDropdownProps) {
  const [isNotificationDropdownOpen, setIsNotificationDropdownOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: 1,
      type: 'order',
      message: 'Your order #12345 has been shipped and is on its way!',
      time: '2 hours ago',
      isRead: false,
      link: '/orders'
    },
    {
      id: 2,
      type: 'promo',
      message: 'Flash sale! 30% off all ceiling lights this weekend only',
      time: '5 hours ago',
      isRead: false,
      link: '/sales'
    },
    {
      id: 3,
      type: 'review',
      message: 'Your review for "Modern Chandelier" received a helpful response',
      time: 'Yesterday',
      isRead: true,
      link: '/reviews'
    },
    {
      id: 4,
      type: 'system',
      message: 'Your account information was successfully updated',
      time: '3 days ago',
      isRead: true,
      link: '/account'
    },
    {
      id: 5,
      type: 'favorite',
      message: 'Your favorite "Crystal Pendant Light" is back in stock!',
      time: '1 week ago',
      isRead: true,
      link: '/favorites'
    }
  ]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'order':
        return <Icon icon="mdi:package-variant" className="h-5 w-5 text-blue-600" />;
      case 'promo':
        return <Icon icon="mdi:tag" className="h-5 w-5 text-green-600" />;
      case 'review':
        return <Icon icon="mdi:comment-text" className="h-5 w-5 text-purple-600" />;
      case 'system':
        return <Icon icon="mdi:information" className="h-5 w-5 text-gray-600" />;
      case 'favorite':
        return <Icon icon="mdi:heart" className="h-5 w-5 text-red-600" />;
      default:
        return <Icon icon="mdi:bell" className="h-5 w-5 text-gray-600" />;
    }
  };

  const markAsRead = (id: number) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, isRead: true }
          : notification
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, isRead: true }))
    );
  };

  const deleteNotification = (id: number) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  useEffect(() => {
    if (!isNotificationDropdownOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsNotificationDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isNotificationDropdownOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsNotificationDropdownOpen(!isNotificationDropdownOpen)}
        className="relative text-black hover:text-gray-600 transition-all duration-200 hover:scale-110"
        aria-label="Notifications"
      >
        <Icon 
          icon={isNotificationDropdownOpen ? "mdi:bell" : "mdi:bell-outline"} 
          width="28" 
          height="28" 
        />

        {user && unreadCount > 0 && (
          <span className={`absolute -top-1 -right-1 bg-gradient-to-r from-gray-800 to-black text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center font-bold shadow-lg ${
            unreadCount > 9 ? 'px-1' : ''
          }`}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isNotificationDropdownOpen && (
        <div className="absolute right-0 sm:right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl z-50 overflow-hidden border border-gray-100 transform origin-top-right animate-scale-in max-w-[calc(100vw-2rem)]">
          <div className="py-3 px-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 flex justify-between items-center">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <Icon icon="mdi:bell-outline" className="w-5 h-5 text-black" />
              Notifications
            </h3>
            {user && unreadCount > 0 && (
              <button 
                onClick={markAllAsRead}
                className="text-sm text-gray-600 hover:text-black font-medium transition-colors duration-200 flex items-center gap-1 hover:bg-gray-100 px-2 py-1 rounded-lg"
              >
                <Icon icon="mdi:check-all" className="w-4 h-4" />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 sm:max-h-96 overflow-y-auto custom-scrollbar">
            {user ? (
              notifications.length > 0 ? (
                <div className="py-1">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`px-4 py-3 hover:bg-gray-50 transition-all duration-200 group relative ${
                        !notification.isRead ? 'bg-gray-50/50' : 'bg-white'
                      }`}
                      onClick={() => {
                        if (!notification.isRead) {
                          markAsRead(notification.id);
                        }
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`flex-shrink-0 p-2 rounded-lg ${
                          notification.type === 'order' ? 'bg-blue-50' :
                          notification.type === 'promo' ? 'bg-green-50' :
                          notification.type === 'review' ? 'bg-purple-50' :
                          notification.type === 'favorite' ? 'bg-red-50' :
                          'bg-gray-50'
                        }`}>
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm leading-relaxed ${
                            notification.isRead
                              ? 'text-gray-600'
                              : 'text-gray-800 font-medium'
                          }`}>
                            {notification.message}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <p className="text-xs text-gray-500 flex items-center gap-1">
                              <Icon icon="mdi:clock-outline" className="w-3.5 h-3.5" />
                              {notification.time}
                            </p>
                            {!notification.isRead && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-black text-white">
                                New
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notification.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-gray-400 hover:text-red-500 p-1 hover:bg-red-50 rounded-lg"
                        >
                          <Icon icon="mdi:close" className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center px-4">
                  <div className="bg-gray-50 rounded-full w-16 h-16 mx-auto flex items-center justify-center mb-4">
                    <Icon icon="mdi:bell-off-outline" className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-base font-semibold text-gray-800 mb-2">No notifications yet</h3>
                  <p className="text-sm text-gray-500">
                    We'll notify you about your orders, promotions, and updates
                  </p>
                </div>
              )
            ) : (
              <div className="py-6 px-4 text-center bg-gradient-to-b from-gray-50 to-white">
                <div className="bg-gray-50 rounded-full w-16 h-16 mx-auto flex items-center justify-center mb-4">
                  <Icon icon="mdi:account-alert-outline" className="h-8 w-8 text-gray-600" />
                </div>
                <h3 className="text-base font-semibold text-gray-800 mb-2">Sign in to view notifications</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Stay updated with your orders and promotions
                </p>
                <button 
                  className="inline-flex items-center px-6 py-2.5 bg-black text-white rounded-lg hover:bg-gray-800 transition-all duration-300 font-medium text-sm"
                  onClick={() => {
                    setIsNotificationDropdownOpen(false);
                    onOpenAuthModal();
                  }}
                >
                  <Icon icon="mdi:login" className="w-4 h-4 mr-2" />
                  Sign in
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Add custom CSS for animations
const styles = `
  @keyframes scale-in {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  .animate-scale-in {
    animation: scale-in 0.2s ease-out;
  }

  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
  }

  .custom-scrollbar::-webkit-scrollbar-track {
    background: #f1f1f1;
  }

  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #4b5563;
    border-radius: 3px;
  }

  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #000000;
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}

