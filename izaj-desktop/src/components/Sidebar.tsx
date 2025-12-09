import { Icon } from '@iconify/react';
import { Session } from '@supabase/supabase-js';
import API_URL from '../../config/api';


interface SidebarProps {
  avatar: string;
  session: Session | null;
  sidebarCollapsed: boolean;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  currentPage: string;
  handleNavigation: (page: string) => void;
  setIsLoggedIn: (loggedIn: boolean) => void;
  adminContext: {
    is_super_admin: boolean;
    role: string | null;
  };
}

const allNavigationItems = [
  { icon: 'mdi:view-dashboard', label: 'DASHBOARD' },
  { icon: 'mdi:shopping-outline', label: 'PRODUCTS' },
  { icon: 'mdi:clipboard-list-outline', label: 'ORDERS' },
  { icon: 'mdi:credit-card-outline', label: 'PAYMENTS' },
  { icon: 'mdi:star-outline', label: 'FEEDBACKS' },
  { icon: 'mdi:message-text', label: 'MESSAGES' },
];

const Sidebar = ({
  avatar,
  sidebarCollapsed,
  mobileMenuOpen,
  setMobileMenuOpen,
  currentPage,
  handleNavigation,
  setIsLoggedIn,
  session,
  adminContext
}: SidebarProps) => 
  {
    // Filter navigation items based on admin role
    // Regular admins (role === 'Admin' and !is_super_admin) should not see ORDERS, PAYMENTS, FEEDBACKS
    const isRegularAdmin = adminContext.role === 'Admin' && !adminContext.is_super_admin;
    const restrictedLabels = ['ORDERS', 'PAYMENTS', 'FEEDBACKS'];
    
    const navigationItems = allNavigationItems.filter(item => {
      if (isRegularAdmin && restrictedLabels.includes(item.label)) {
        return false;
      }
      return true;
    });

    const handleLogout = async () => {
    await fetch(`${API_URL}/api/admin/logout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session?.access_token || ''}`,
        'Content-Type': 'application/json',
      },
    });
    console.log(session?.user?.email, 'logged out successfully');
    setIsLoggedIn(false);
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-all duration-300 lg:hidden ${
          mobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setMobileMenuOpen(false)}
      ></div>
      <aside
        className={`
          m-0 z-50 fixed lg:static top-0 left-0
          h-screen
          overflow-hidden
          transition-all duration-300 ease-in-out
          ${sidebarCollapsed ? 'w-14 sm:w-16 md:w-20' : 'w-56 sm:w-60 md:w-64'}
          bg-gradient-to-b from-white via-gray-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 border-r border-gray-100 dark:border-gray-800 flex flex-col
          shrink-0 shadow-2xl lg:shadow-xl
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
        `}
      >
        {/* Mobile header: Logo, Title, and Close Button */}
        <div className="flex items-center justify-between px-4 py-4 lg:hidden border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-yellow-50 to-white dark:from-gray-800 dark:to-gray-700">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 flex items-center justify-center">
              <img
                src="/izaj.jpg"
                alt="IZAJ Logo"
                className="w-10 h-10 rounded-full bg-yellow-400 border-4 border-yellow-200 dark:border-yellow-600 shadow-lg"
              />
            </div>
            <h1
              className="text-2xl font-regular text-gray-800 dark:text-slate-100 drop-shadow-lg"
              style={{
                fontFamily: "'Playfair Display', serif",
                textShadow: "-2px 0px 2px rgba(0, 0, 0, 0.5)",
                letterSpacing: "8px",
              }}
            >
              IZAJ
            </h1>
          </div>
          <button
            className="p-2 rounded-xl bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/30 border border-gray-200 dark:border-gray-700 shadow-md transition-all duration-200 active:scale-95"
            onClick={() => setMobileMenuOpen(false)}
          >
            <Icon icon="mdi:close" className="w-6 h-6 text-gray-600 dark:text-gray-300" />
          </button>
        </div>

        {/* Desktop header: Logo and Title */}
        <div className={`hidden lg:flex items-center ${sidebarCollapsed ? 'justify-center' : ''} px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4`}>
          <div className="flex-shrink-0 flex items-center justify-center">
            <img
              src="/izaj.jpg"
              alt="IZAJ Logo"
              className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-full bg-yellow-400 border-4 border-yellow-200 shadow-lg"
            />
          </div>
          {!sidebarCollapsed && (
            <h1
              className="text-xl sm:text-2xl md:text-4xl font-semibold text-black dark:text-slate-100 ml-3 sm:ml-4 md:ml-6"
              style={{
                fontFamily: "'Playfair Display', serif",
                textShadow: "-2px 0px 2px rgba(0, 0, 0, 0.5)",
                letterSpacing: "10px",
              }}
            >
              IZAJ
            </h1>
          )}
        </div>

        <div className="flex-1 overflow-y-auto flex flex-col">
          <nav className={`${sidebarCollapsed ? 'p-2' : 'p-4 lg:p-6'} flex-1`}>
            <ul className="space-y-2">
              {navigationItems.map((item, idx) => (
                <li key={idx}>
                  <button
                    className={`w-full flex items-center transition-all duration-200 ${
                      sidebarCollapsed ? 'justify-center px-2 py-3' : 'gap-3 px-3 py-3'
                    } text-gray-700 dark:text-gray-300 hover:bg-gradient-to-r hover:from-gray-100 hover:to-gray-200 dark:hover:from-gray-700 dark:hover:to-gray-600 rounded-xl font-semibold relative group active:scale-95 ${
                      currentPage === item.label 
                        ? 'bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 border-l-4 border-gray-900 dark:border-gray-400 shadow-lg text-gray-900 dark:text-gray-100' 
                        : 'hover:text-gray-900 dark:hover:text-gray-100'
                    }`}
                    onClick={() => handleNavigation(item.label)}
                  >
                    <Icon 
                      icon={item.icon} 
                      className={`${sidebarCollapsed ? 'w-6 h-6' : 'w-5 h-5'} transition-transform ${
                        currentPage === item.label ? 'text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-100'
                      }`} 
                    />
                    {!sidebarCollapsed && (
                      <span className={`text-sm lg:text-base ${currentPage === item.label ? 'text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300'} group-hover:text-gray-900 dark:group-hover:text-gray-100`} style={{ fontFamily: "'Jost', sans-serif" }}>
                        {item.label}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
      
          <div
            className={`flex flex-col items-center ${sidebarCollapsed ? 'px-2' : 'px-4 lg:px-6'} pb-4 lg:pb-6 gap-2 border-t border-gray-100 dark:border-gray-800 pt-4`}
          >
            <button
              className={`flex items-center w-full transition-all duration-200 active:scale-95 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl ${
                sidebarCollapsed ? 'justify-center px-2 py-3 mb-2' : 'gap-3 mb-4 justify-start px-3 py-3'
              } ${
                currentPage === 'PROFILE' ? 'bg-gray-50 dark:bg-gray-700 shadow-sm' : ''
              }`}
              onClick={() => handleNavigation('PROFILE')}
            >
              <img
                src={avatar || "/profile.jpg"}
                alt="Profile"
                className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 border-2 border-gray-200 dark:border-gray-700 shadow-sm"
                onError={e => { (e.currentTarget as HTMLImageElement).src = "/profile.jpg"; }}
              />
              {!sidebarCollapsed && (
                <span className={`text-sm font-semibold ${
                  currentPage === 'PROFILE' ? 'text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400'
                } hover:text-gray-900 dark:hover:text-gray-100`} style={{ fontFamily: "'Jost', sans-serif" }}>Profile</span>
              )}
            </button>
            {/* Only show Settings button if user is SuperAdmin */}
            {!isRegularAdmin && (
              <button
                className={`flex items-center w-full transition-all duration-200 active:scale-95 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl ${
                  sidebarCollapsed ? 'justify-center px-2 py-3' : 'gap-3 justify-start px-3 py-3'
                } ${
                  currentPage === 'SETTINGS' ? 'bg-gray-50 dark:bg-gray-700 shadow-sm' : ''
                }`}
                onClick={() => handleNavigation('SETTINGS')}
              >
                <Icon
                  icon="mdi:cog-outline"
                  className={`${sidebarCollapsed ? 'w-6 h-6' : 'w-5 h-5'} ${
                    currentPage === 'SETTINGS' ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'
                  }`}
                />
                {!sidebarCollapsed && (
                  <span className={`text-sm font-semibold ${
                    currentPage === 'SETTINGS' ? 'text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400'
                  } hover:text-gray-900 dark:hover:text-gray-100`} style={{ fontFamily: "'Jost', sans-serif" }}>Settings</span>
                )}
              </button>
            )}

            {/* Logout Button */}
            <button
              className={`flex items-center w-full mt-2 transition-all duration-200 active:scale-95 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl ${
                sidebarCollapsed ? 'justify-center px-2 py-3' : 'gap-3 justify-start px-3 py-3'
              }`}
              onClick={handleLogout}
            >
              <Icon
                icon="mdi:logout"
                className={`${sidebarCollapsed ? 'w-6 h-6' : 'w-5 h-5'} text-red-500 dark:text-red-400`}
              />
              {!sidebarCollapsed && (
                <span className="text-sm font-semibold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300" style={{ fontFamily: "'Jost', sans-serif" }}>Log Out</span>
              )}
            </button>
          
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;