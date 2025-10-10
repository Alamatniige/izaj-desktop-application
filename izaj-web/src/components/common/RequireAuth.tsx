"use client";

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserContext } from '../../context/UserContext';

interface RequireAuthProps {
  children: React.ReactNode;
  redirectTo?: string;
}

const RequireAuth: React.FC<RequireAuthProps> = ({ children, redirectTo = '/' }) => {
  const { user, isLoading } = useUserContext();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace(redirectTo);
    }
  }, [isLoading, user, router, redirectTo]);

  if (isLoading) return null;
  if (!user) return null;

  return <>{children}</>;
};

export default RequireAuth;


