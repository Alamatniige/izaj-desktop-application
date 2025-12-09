import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Products } from './pages/products';
import Orders from './pages/orders';
import Payments from './pages/payments';
import Feedbacks from './pages/feedbacks';
import Profile from './pages/profile';
import Settings from './pages/settings';
import Messages from './pages/messages';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import { Session } from '@supabase/supabase-js';
import { ProfileData } from './pages/profile';
import PrivateRoute from './route/PrivateRoute';
import { useNotifications } from './utils/notificationsProvider';
import { useSessionContext } from './utils/sessionContext';
import UpdatePassword from './pages/update-password';
import AcceptInvite from './pages/accept-invite';
import ITMaintenance from './pages/ITMaintenance';
import API_URL from '../config/api';
import { Icon } from '@iconify/react';

function App() {
  const location = useLocation();
  const { session, setSession } = useSessionContext();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentPage, setCurrentPage] = useState('DASHBOARD');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false); 
  const {
    notifications,
    notificationsOpen,
    toggleNotifications,
    handleNotificationClick,
    markAllAsRead,
  } = useNotifications();

  const [profile, setProfile] = useState<ProfileData>({
    name: "",
    email: "",
    password: "",
    phone: "",
    role: "",
    address: "",
    avatar: "/profile.jpg",
  });

  const [adminContext, setAdminContext] = useState<{
    is_super_admin: boolean;
    role: string | null;
  }>({
    is_super_admin: false,
    role: null,
  });

  const [isLoadingContext, setIsLoadingContext] = useState(true);
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [isCheckingMaintenance, setIsCheckingMaintenance] = useState(true);

  useEffect(() => {
    if (session?.user?.id) {
      setIsLoadingContext(true);
      setIsCheckingMaintenance(true);
      
      fetch(`${API_URL}/api/profile/${session.user.id}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })
        .then(res => res.json())
        .then(data => {
          if (data.success && data.profile) {
            setProfile(data.profile);
          }
        })
        .catch(err => console.error('Failed to fetch profile:', err));

      // Fetch admin context
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
        })
        .finally(() => {
          setIsLoadingContext(false);
        });

      // Fetch maintenance status
      const checkMaintenanceStatus = () => {
        fetch(`${API_URL}/api/maintenance/status`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        })
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              setIsMaintenanceMode(data.maintenance || false);
            }
          })
          .catch(error => {
            console.error('Failed to fetch maintenance status:', error);
          })
          .finally(() => {
            setIsCheckingMaintenance(false);
          });
      };

      checkMaintenanceStatus();

      // Poll maintenance status every 30 seconds for regular admins
      let intervalId: NodeJS.Timeout | null = null;
      if (adminContext.role !== 'IT_MAINTENANCE') {
        intervalId = setInterval(checkMaintenanceStatus, 30000);
      }

      return () => {
        if (intervalId) clearInterval(intervalId);
      };
    } else {
      setIsLoadingContext(false);
      setIsCheckingMaintenance(false);
    }
  }, [session, adminContext.role]);

  const handleLoginSuccess = (sessionData: Session) => {
    setSession(sessionData);
    setIsLoggedIn(true);
    // Reset to dashboard after successful login
    setCurrentPage('DASHBOARD');
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.notification-container')) { /* empty */ }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle update-password route - after all hooks are called
  // This ensures it's rendered even if user is not logged in
  if (location.pathname === '/update-password') {
    return <UpdatePassword />;
  }
  
  // Handle accept-invite route
  if (location.pathname === '/accept-invite') {
    return <AcceptInvite />;
  }

  const handleNavigation = (page: string) => {
    // Check if regular admin is trying to access restricted pages
    const isRegularAdmin = adminContext.role === 'Admin' && !adminContext.is_super_admin;
    const restrictedPages = ['ORDERS', 'PAYMENTS', 'FEEDBACKS', 'SETTINGS'];
    
    if (isRegularAdmin && restrictedPages.includes(page)) {
      // Redirect to dashboard if regular admin tries to access restricted page
      setCurrentPage('DASHBOARD');
      return;
    }
    
    setCurrentPage(page);
  };

  const renderContent = () => {
    // Check if regular admin is trying to access restricted pages
    const isRegularAdmin = adminContext.role === 'Admin' && !adminContext.is_super_admin;
    const restrictedPages = ['ORDERS', 'PAYMENTS', 'FEEDBACKS', 'SETTINGS'];
    
    // If regular admin tries to access restricted page, redirect to dashboard
    if (isRegularAdmin && restrictedPages.includes(currentPage)) {
      return <Dashboard session={session} onNavigate={handleNavigation} isActive={currentPage === 'DASHBOARD'} />;
    }

    switch (currentPage) {
      case 'PRODUCTS':
        return <Products  
          session={session}
          showAddProductModal={showAddProductModal} 
          setShowAddProductModal={setShowAddProductModal} 
        />;
      case 'ORDERS':
        return <Orders session={session} setIsOverlayOpen={setIsOverlayOpen} />;
      case 'FEEDBACKS':
        return <Feedbacks session={session} setIsFeedbackModalOpen={setIsFeedbackModalOpen} />;
      case 'PAYMENTS':
        return <Payments session={session} setIsOverlayOpen={setIsOverlayOpen} />;
      case 'MESSAGES':
        return <Messages session={session} />;
      case 'PROFILE':
        return <Profile session={session} setProfile={setProfile} profile={profile} handleNavigation={handleNavigation} />;
      case 'SETTINGS':
        return <Settings session={session} handleNavigation={handleNavigation} />;
      case 'UPDATE_PASSWORD':
        return <UpdatePassword />;
      case 'DASHBOARD':
      default:
        return <Dashboard session={session} onNavigate={handleNavigation} isActive={currentPage === 'DASHBOARD'} adminContext={adminContext} />;
    }
  };

  return (
    <PrivateRoute isLoggedIn={isLoggedIn} onLogin={handleLoginSuccess}>
      {isLoadingContext || isCheckingMaintenance ? (
        // Loading screen while fetching user context
        <div className="flex h-screen w-screen items-center justify-center bg-white dark:bg-gray-900">
          <div className="text-center">
            <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-yellow-500 border-r-transparent"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
          </div>
        </div>
      ) : adminContext.role === 'IT_MAINTENANCE' ? (
        <ITMaintenance 
          session={session} 
          handleNavigation={handleNavigation}
          onMaintenanceToggle={(newStatus: boolean) => setIsMaintenanceMode(newStatus)}
        />
      ) : (
        <div className="flex h-screen w-screen overflow-hidden bg-white dark:bg-gray-900 relative">
          <Sidebar
            avatar={profile.avatar}
            session={session}
            sidebarCollapsed={sidebarCollapsed}
            mobileMenuOpen={mobileMenuOpen}
            setMobileMenuOpen={setMobileMenuOpen}
            currentPage={currentPage}
            handleNavigation={handleNavigation}
            setIsLoggedIn={setIsLoggedIn}
            adminContext={adminContext}
          />

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header attached to sidebar */}
            {currentPage !== 'MESSAGES' && currentPage !== 'PROFILE' && currentPage !== 'SETTINGS' && !isOverlayOpen && !showAddProductModal && !isFeedbackModalOpen && (
              <Header
                session={session}
                sidebarCollapsed={sidebarCollapsed}
                setMobileMenuOpen={setMobileMenuOpen}
                setSidebarCollapsed={setSidebarCollapsed}
                notifications={notifications}
                notificationsOpen={notificationsOpen}
                toggleNotifications={toggleNotifications}
                handleNotificationClick={handleNotificationClick}
                markAllAsRead={markAllAsRead}
              />
            )}
            
            {/* Main Content */}
            <div className="flex-1 overflow-hidden bg-white dark:bg-gray-900">
              <div className="h-full overflow-y-auto scrollbar-none px-2 sm:px-4 md:px-6">
                <div className="w-full max-w-[2000px] mx-auto">
                  {renderContent()}
                </div>
              </div>
            </div>
          </div>

          {/* Maintenance Mode Blocking Modal */}
          {isMaintenanceMode && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center">
              {/* Reduced Blur Background */}
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
              
              {/* Modal Content */}
              <div className="relative z-10 bg-gradient-to-br from-white to-gray-50 dark:from-slate-800 dark:to-slate-900 rounded-3xl shadow-2xl w-full max-w-lg mx-4 p-8 border-2 border-orange-200 dark:border-orange-900/50 animate-slideUp">
                {/* Icon */}
                <div className="flex justify-center mb-6">
                  <div className="relative">
                    <div className="absolute inset-0 bg-orange-500 rounded-full blur-xl opacity-50 animate-pulse"></div>
                    <div className="relative p-6 bg-gradient-to-br from-orange-500 to-red-600 rounded-full shadow-2xl">
                      <Icon icon="mdi:tools" className="w-16 h-16 text-white" />
                    </div>
                  </div>
                </div>

                {/* Title */}
                <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-3" style={{ fontFamily: "'Jost', sans-serif" }}>
                  System Under Maintenance
                </h2>

                {/* Subtitle */}
                <p className="text-center text-gray-600 dark:text-gray-400 mb-6" style={{ fontFamily: "'Jost', sans-serif" }}>
                  We're currently performing system maintenance
                </p>

                {/* Info Box */}
                <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-2xl p-6 mb-6 border-2 border-orange-200 dark:border-orange-800">
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-orange-500 rounded-lg shadow-lg flex-shrink-0">
                      <Icon icon="mdi:alert-circle" className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-2" style={{ fontFamily: "'Jost', sans-serif" }}>
                        What does this mean?
                      </h3>
                      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed" style={{ fontFamily: "'Jost', sans-serif" }}>
                        The system is currently unavailable for regular use. Our IT team is working to ensure everything runs smoothly. 
                        Please try again later.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Contact Box */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-6 mb-6 border-2 border-blue-200 dark:border-blue-800">
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-blue-500 rounded-lg shadow-lg flex-shrink-0">
                      <Icon icon="mdi:headset" className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-2" style={{ fontFamily: "'Jost', sans-serif" }}>
                        Need Assistance?
                      </h3>
                      <p className="text-sm text-gray-700 dark:text-gray-300" style={{ fontFamily: "'Jost', sans-serif" }}>
                        If you need urgent access, please contact the IT support team for assistance.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Logout Button */}
                <button
                  onClick={async () => {
                    try {
                      // Call logout API
                      await fetch(`${API_URL}/api/admin/logout`, {
                        method: 'POST',
                        headers: {
                          'Authorization': `Bearer ${session?.access_token || ''}`,
                          'Content-Type': 'application/json',
                        },
                      });
                      
                      // Clear session and redirect
                      setSession(null);
                      setIsLoggedIn(false);
                      window.location.href = '/';
                    } catch (error) {
                      console.error('Logout error:', error);
                      // Force reload even if API call fails
                      window.location.href = '/';
                    }
                  }}
                  className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                  style={{ fontFamily: "'Jost', sans-serif" }}
                >
                  <Icon icon="mdi:logout" className="w-5 h-5" />
                  Log Out
                </button>

                {/* Footer */}
                <div className="mt-4 text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400" style={{ fontFamily: "'Jost', sans-serif" }}>
                    Thank you for your patience and understanding
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </PrivateRoute>
  );
}

export default App;