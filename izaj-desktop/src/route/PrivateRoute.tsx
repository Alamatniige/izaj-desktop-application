import React, { useState } from "react";
import Login from "../pages/login";
import ForgotPass from "../pages/forgotpass";

interface PrivateRouteProps {
  isLoggedIn: boolean;
  onLogin: (sessionData: any) => void;
  children: React.ReactNode;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ isLoggedIn, onLogin, children }) => {
  const [currentPage, setCurrentPage] = useState<'LOGIN' | 'FORGOTPASS'>('LOGIN');

  const handleNavigation = (page: 'LOGIN' | 'FORGOTPASS') => {
    setCurrentPage(page);
  };

  if (!isLoggedIn) {
    if (currentPage === 'FORGOTPASS') {
      return <ForgotPass onLogin={onLogin} handleNavigation={handleNavigation} />;
    }
    return <Login onLogin={onLogin} handleNavigation={handleNavigation} />;
  }
  
  return <>{children}</>;
};

export default PrivateRoute;