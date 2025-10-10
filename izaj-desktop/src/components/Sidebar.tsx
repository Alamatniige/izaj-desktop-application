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
}

const navigationItems = [
  { icon: 'mdi:view-dashboard', label: 'DASHBOARD' },
  { icon: 'mdi:shopping-outline', label: 'PRODUCTS' },
  { icon: 'mdi:clipboard-list-outline', label: 'ORDERS' },
  { icon: 'mdi:credit-card-outline', label: 'PAYMENTS' },
  { icon: 'mdi:chart-bar', label: 'REPORTS' },
  { icon: 'mdi:star-outline', label: 'FEEDBACKS' },
  { icon: 'mdi:account-group', label: 'CUSTOMERS' },
];

const Sidebar = ({
  avatar,
  sidebarCollapsed,
  mobileMenuOpen,
  setMobileMenuOpen,
  currentPage,
  handleNavigation,
  setIsLoggedIn,
  session
}: SidebarProps) => 
  {

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
        className={`fixed inset-0 z-50 bg-black/40 transition-opacity duration-300 lg:hidden ${
          mobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setMobileMenuOpen(false)}
      ></div>
      <aside
        className={`
          m-0 lg:m-4 z-50 fixed lg:static top-0 left-0
          h-[calc(100vh-2rem)]
          overflow-hidden
          transition-all duration-300 ease-in-out
          ${sidebarCollapsed ? 'w-14 sm:w-16 md:w-20' : 'w-56 sm:w-60 md:w-64'}
          bg-white shadow-2xl hover:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] border-r border-white flex flex-col
          shrink-0 rounded-none lg:rounded-2xl
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
        `}
        style={{
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
        }}
      >
        {/* Mobile header: Logo, Title, and Close Button */}
        <div className="flex items-center justify-between px-2 sm:px-3 md:px-4 py-2 sm:py-3 md:py-4 lg:hidden">
          <div className="flex items-center gap-2">
            <div className="flex-shrink-0 flex items-center justify-center">
              <img
                src="/izaj.jpg"
                alt="IZAJ Logo"
                className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-full bg-yellow-400 border-4 border-yellow-200 shadow-lg"
              />
            </div>
            <h1
              className="text-xl sm:text-2xl md:text-4xl font-regular text-gray-800 drop-shadow-lg"
              style={{
                color: "#000000",
                fontFamily: "'Playfair Display', serif",
                textShadow: "-2px 0px 2px rgba(0, 0, 0, 0.5)",
                letterSpacing: "10px",
              }}
            >
              IZAJ
            </h1>
          </div>
          <button
            className="p-1.5 sm:p-2 rounded-lg bg-white hover:bg-yellow-50 border border-yellow-50 shadow transition"
            onClick={() => setMobileMenuOpen(false)}
          >
            <Icon icon="mdi:close" className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-gray-600" />
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
              className="text-xl sm:text-2xl md:text-4xl font-regular text-gray-800 drop-shadow-lg ml-3 sm:ml-4 md:ml-6"
              style={{
                color: "#000000",
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
          <nav className={`${sidebarCollapsed ? 'p-1.5 sm:p-2' : 'p-3 sm:p-4 md:p-6'} flex-1`}>
            <ul className="space-y-1 sm:space-y-1.5 md:space-y-2">
              {navigationItems.map((item, idx) => (
                <li key={idx}>
                  <button
                    className={`w-full flex items-center transition-all duration-200 ${
                      sidebarCollapsed ? 'justify-center px-1.5 sm:px-2 py-1.5 sm:py-2 md:py-3' : 'gap-1.5 sm:gap-2 md:gap-3 px-1.5 sm:px-2 md:px-3 py-1.5 sm:py-2'
                    } text-gray-800 hover:bg-yellow-100 rounded-lg font-medium relative group ${
                      currentPage === item.label ? 'bg-yellow-100 border-l-4 border-yellow-400 shadow-md' : ''
                    }`}
                    onClick={() => handleNavigation(item.label)}
                  >
                    <Icon icon={item.icon} className={`${sidebarCollapsed ? 'w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6' : 'w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5'} text-gray-800 group-hover:scale-110 transition-transform`} />
                    {!sidebarCollapsed && <span className="text-xs sm:text-sm md:text-base">{item.label}</span>}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
      
          <div
            className={`flex flex-col items-center ${sidebarCollapsed ? 'px-1.5 sm:px-2' : 'px-3 sm:px-4 md:px-6'} pb-3 sm:pb-4 md:pb-6 gap-1.5 sm:gap-2`}
            style={{ marginTop: '-4rem' }}
          >
            <button
              className={`flex items-center w-full transition ${
                sidebarCollapsed ? 'justify-center px-1.5 sm:px-2 py-1.5 sm:py-2 md:py-3 mb-1.5 sm:mb-2' : 'gap-1.5 sm:gap-2 md:gap-3 mb-3 sm:mb-4 justify-start'
              }`}
              onClick={() => handleNavigation('PROFILE')}
            >
              <img
                src={avatar || "/profile.jpg"}
                alt="Profile"
                className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full bg-gray-300 border-2 border-yellow-200"
                onError={e => { (e.currentTarget as HTMLImageElement).src = "/profile.jpg"; }}
              />
              {!sidebarCollapsed && (
                <span className="text-[10px] sm:text-xs md:text-sm font-medium text-gray-600 hover:text-gray-800">Profile</span>
              )}
            </button>
            <button
              className={`flex items-center w-full transition ${
                sidebarCollapsed ? 'justify-center px-1.5 sm:px-2 py-1.5 sm:py-2 md:py-3' : 'gap-1.5 sm:gap-2 md:gap-3 justify-start'
              }`}
              onClick={() => handleNavigation('SETTINGS')}
            >
              <Icon
                icon="mdi:cog-outline"
                className={`${sidebarCollapsed ? 'w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6' : 'w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5'} text-gray-400`}
              />
              {!sidebarCollapsed && (
                <span className="text-[10px] sm:text-xs md:text-sm font-medium text-gray-600 hover:text-gray-800">Settings</span>
              )}
            </button>

            {/* Logout Button */}
            
            <button
              className={`flex items-center w-full mt-1.5 sm:mt-2 transition ${
                sidebarCollapsed ? 'justify-center px-1.5 sm:px-2 py-1.5 sm:py-2 md:py-3' : 'gap-1.5 sm:gap-2 md:gap-3 justify-start'
              }`}
              onClick={handleLogout}
            >
              <Icon
                icon="mdi:logout"
                className={`${sidebarCollapsed ? 'w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6' : 'w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5'} text-red-400`}
              />
              {!sidebarCollapsed && (
                <span className="text-[10px] sm:text-xs md:text-sm font-medium text-red-600 hover:text-red-800">Log Out</span>
              )}
            </button>
          
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;