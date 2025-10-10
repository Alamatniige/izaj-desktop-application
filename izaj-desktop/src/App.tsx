import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Products } from './pages/products';
import Orders from './pages/orders';
import Reports from './pages/reports';
import Payments from './pages/payments';
import Feedbacks from './pages/feedbacks';
import Profile from './pages/profile';
import Settings from './pages/settings';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
// import Customers from './pages/Customers'; // Removed - customer stats now shown in Dashboard only
import { Session } from '@supabase/supabase-js';
import { ProfileData } from './pages/profile';
import PrivateRoute from './route/PrivateRoute';
import { useNotifications } from './utils/notificationsProvider';
import UpdatePassword from './pages/update-password';
import API_URL from '../config/api';

function App() {
  const location = useLocation();
  const [session, setSession] = useState<Session | null>(null);
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

  useEffect(() => {
    if (session?.user?.id) {
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
        });
    }
  }, [session]);

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

  const handleNavigation = (page: string) => {
    setCurrentPage(page);
  };

  const renderContent = () => {
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
      case 'REPORTS':
        return <Reports session={session} />;
      // case 'CUSTOMERS': // Removed - customer data now shown in Dashboard stats card only
      //   return <Customers session={session} />;
      case 'PROFILE':
        return <Profile session={session} setProfile={setProfile} profile={profile} handleNavigation={handleNavigation} />;
      case 'SETTINGS':
        return <Settings session={session} handleNavigation={handleNavigation} />;
      case 'UPDATE_PASSWORD':
        return <UpdatePassword />;
      case 'DASHBOARD':
      default:
        return <Dashboard session={session} onNavigate={handleNavigation} />;
    }
  };

  // Handle update-password route separately
  if (location.pathname === '/update-password') {
    return <UpdatePassword />;
  }

  return (
    <PrivateRoute isLoggedIn={isLoggedIn} onLogin={handleLoginSuccess}>
      <div className="flex h-screen w-screen overflow-hidden bg-white">
        <Sidebar
          avatar={profile.avatar}
          session={session}
          sidebarCollapsed={sidebarCollapsed}
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
          currentPage={currentPage}
          handleNavigation={handleNavigation}
          setIsLoggedIn={setIsLoggedIn}
        />

        {/* Main Content Area */}
        <div className={`flex-1 flex flex-col ${currentPage === 'MESSAGES' ? 'h-screen' : 'h-[calc(100vh-5rem)]'} overflow-hidden transition-all duration-300 ${currentPage === 'MESSAGES' || currentPage === 'PROFILE' || currentPage === 'SETTINGS' ? '' : 'mt-2 sm:mt-4'} scrollbar-none`}>
          {/* Dashboard Main Content */}
          <div className="flex-1 overflow-hidden">
            <div className="h-full overflow-y-auto scrollbar-none px-2 sm:px-4 md:px-6">
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
              <div className="w-full max-w-[2000px] mx-auto">
                {renderContent()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </PrivateRoute>
  );
}

export default App;