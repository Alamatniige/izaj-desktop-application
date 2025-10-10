"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
// import { useSimpleSessionContext } from './SimpleSessionContext';

interface UserContextType {
  user: User | null;
  isLoading: boolean;
  login: (identifier: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => void;
  register: (userData: RegisterData) => Promise<void>;
  updateProfile: (userData: Partial<User>) => Promise<void>;
  uploadProfilePicture: (file: File) => Promise<string>;
  removeProfilePicture: () => Promise<void>;
  loginWithProvider: (provider: 'google') => Promise<void>;
}

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  address?: {
    province: string;
    city: string;
    barangay: string;
    address: string;
  };
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const hydrate = async () => {
      try {
        console.log('🔄 UserContext: Checking for existing user...');
        
        // First check localStorage (for remember me users)
        const storedUser = localStorage.getItem('user');
        const rememberMe = localStorage.getItem('rememberMe');
        if (storedUser && rememberMe === 'true') {
          const userData = JSON.parse(storedUser);
          console.log('✅ UserContext: Found user in localStorage (remember me):', userData);
          setUser(userData);
          setIsLoading(false);
          return;
        }
        
        // Check sessionStorage for session-only users
        const sessionUser = sessionStorage.getItem('user');
        if (sessionUser) {
          const userData = JSON.parse(sessionUser);
          console.log('✅ UserContext: Found user in sessionStorage:', userData);
          setUser(userData);
          setIsLoading(false);
          return;
        }
        
        // If no localStorage user, check server
        console.log('🔍 UserContext: No localStorage user, checking server...');
        const res = await fetch('/api/auth/me', { cache: 'no-store' });
        const { user: supabaseUser } = await res.json();
        
        if (!supabaseUser) {
          console.log('❌ UserContext: No user found on server');
          setIsLoading(false);
          return;
        }

        console.log('✅ UserContext: Found user on server:', supabaseUser);
        const name: string = (supabaseUser.user_metadata?.name as string) || '';
        const [firstName, ...rest] = name.trim().split(' ');
        const lastName = rest.join(' ');
        const phone: string = (supabaseUser.user_metadata?.phone as string) || '';

        const userData: User = {
          id: supabaseUser.id,
          email: supabaseUser.email,
          firstName: firstName || '',
          lastName: lastName || '',
          phone,
          role: 'customer',
          isEmailVerified: Boolean(supabaseUser.email_confirmed_at) || Boolean(supabaseUser.user_metadata?.emailConfirmed),
          createdAt: new Date(supabaseUser.created_at || Date.now()),
          updatedAt: new Date(),
        };
        
        console.log('💾 UserContext: Storing user data:', userData);
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
      } catch (error) {
        console.error('❌ UserContext: Error during hydration:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    hydrate();
  }, []);

  const login = async (identifier: string, password: string, rememberMe: boolean = false) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password, rememberMe })
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error || 'Login failed');
      }

      const supabaseUser = result.user || {};
      const name: string = (supabaseUser.user_metadata?.name as string) || '';
      const [firstName, ...rest] = name.trim().split(' ');
      const lastName = rest.join(' ');
      const phone: string = (supabaseUser.user_metadata?.phone as string) || '';

      const userData: User = {
        id: supabaseUser.id || 'unknown',
        email: supabaseUser.email || identifier,
        firstName: firstName || '',
        lastName: lastName || '',
        phone,
        role: 'customer',
        isEmailVerified: Boolean(supabaseUser.email_confirmed_at) || Boolean(supabaseUser.user_metadata?.emailConfirmed),
        createdAt: new Date(supabaseUser.created_at || Date.now()),
        updatedAt: new Date(),
      };

      setUser(userData);
      
      // Debug: Log profile images in localStorage
      console.log('🔍 Profile images in localStorage after login:');
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('profileImage_')) {
          console.log(`  ${key}: ${localStorage.getItem(key)?.substring(0, 50)}...`);
        }
      });
      
      // Store user data based on remember me preference
      if (rememberMe) {
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('rememberMe', 'true');
      } else {
        // Store in sessionStorage for session-only persistence
        sessionStorage.setItem('user', JSON.stringify(userData));
        localStorage.removeItem('rememberMe');
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try { 
      await fetch('/api/auth/logout', { method: 'POST' }); 
    } catch {}
    
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('rememberMe');
    sessionStorage.removeItem('user');
    localStorage.removeItem('cart'); // Clear cart on logout
    // Note: Profile images and addresses are kept in localStorage to persist across sessions
    // They are user-scoped by ID so no cross-account contamination
    console.log('🚪 UserContext: User logged out');
  };

  const register = async (userData: RegisterData) => {
    setIsLoading(true);
    try {
      const fullName = `${userData.firstName} ${userData.lastName}`.trim();
      
      const payload = {
        email: userData.email,
        password: userData.password,
        name: fullName,
        phone: userData.phone,
        address: userData.address,
      };
      
      console.log('📝 UserContext - Register payload:', {
        ...payload,
        password: '***hidden***',
        firstName: userData.firstName,
        lastName: userData.lastName,
        fullNameLength: fullName.length,
        nameValue: `"${fullName}"`
      });
      
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error || 'Signup failed');
      }
      
      // Address is now automatically saved to the database during signup
      // No need to save to localStorage since it will be fetched from the database
      
      // Do not auto-login after signup; user should login explicitly.
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (userData: Partial<User>) => {
    if (!user) return;

    setIsLoading(true);
    try {
      const updatedUser = { ...user, ...userData, updatedAt: new Date() };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    } catch (error) {
      console.error('Profile update error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const uploadProfilePicture = async (file: File): Promise<string> => {
    try {
      const formData = new FormData();
      formData.append('profilePicture', file);

      const response = await fetch('/api/profile/upload-picture', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error || 'Failed to upload profile picture');
      }

      // Update local user data with new profile picture
      if (user) {
        const updatedUser = { ...user, profilePicture: result.profilePictureUrl };
        setUser(updatedUser);
        
        // Update localStorage/sessionStorage
        const storage = localStorage.getItem('rememberMe') === 'true' ? localStorage : sessionStorage;
        storage.setItem('user', JSON.stringify(updatedUser));
        // Store profile image with user ID to ensure isolation per account
        localStorage.setItem(`profileImage_${user.id}`, result.profilePictureUrl);
        console.log(`💾 Stored profile image for user ${user.id}: ${result.profilePictureUrl.substring(0, 50)}...`);
      }

      return result.profilePictureUrl;
    } catch (error) {
      console.error('Profile picture upload error:', error);
      throw error;
    }
  };

  const removeProfilePicture = async (): Promise<void> => {
    try {
      const response = await fetch('/api/profile/upload-picture', {
        method: 'DELETE',
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error || 'Failed to remove profile picture');
      }

      // Update local user data
      if (user) {
        const updatedUser = { ...user, profilePicture: null };
        setUser(updatedUser);
        
        // Update localStorage/sessionStorage
        const storage = localStorage.getItem('rememberMe') === 'true' ? localStorage : sessionStorage;
        storage.setItem('user', JSON.stringify(updatedUser));
        // Remove profile image with user ID to ensure isolation per account
        localStorage.removeItem(`profileImage_${user.id}`);
      }
    } catch (error) {
      console.error('Profile picture removal error:', error);
      throw error;
    }
  };

  const loginWithProvider = async (provider: 'google') => {
    // Redirect to our OAuth route; session will be set by Supabase cookies
    window.location.href = `/api/auth/oauth?provider=${provider}`;
  };

  return (
    <UserContext.Provider value={{
      user,
      isLoading,
      login,
      logout,
      register,
      updateProfile,
      uploadProfilePicture,
      removeProfilePicture,
      loginWithProvider,
    }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUserContext = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUserContext must be used within a UserProvider');
  }
  return context;
};
