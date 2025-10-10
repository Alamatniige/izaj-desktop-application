"use client";

import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import Link from 'next/link';
import RequireAuth from '../../common/RequireAuth';

const ChangePass: React.FC = () => {
  const [userData, setUserData] = useState({
    firstName: '',
    lastName: '',
  });
  const [profileImage, setProfileImage] = useState<string>('');
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    general: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showPasswords, setShowPasswords] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });

  useEffect(() => {
    const storedUser = localStorage.getItem('user') || sessionStorage.getItem('user');
    
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setUserData({
          firstName: user.firstName || '',
          lastName: user.lastName || '',
        });
        // Get profile image using user ID for proper isolation
        const storedProfileImage = localStorage.getItem(`profileImage_${user.id}`);
        if (storedProfileImage) {
          setProfileImage(storedProfileImage);
        }
      } catch (error) {
        console.error('Error parsing stored user data:', error);
      }
    }
  }, []);

  // Password strength validation
  const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    setErrors(prev => ({ ...prev, [name]: '', general: '' }));
    setSuccessMessage('');
  };

  const togglePasswordVisibility = (field: keyof typeof showPasswords) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({ currentPassword: '', newPassword: '', confirmPassword: '', general: '' });
    setSuccessMessage('');

    // Validate form
    const newErrors = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
      general: '',
    };

    if (!formData.currentPassword.trim()) {
      newErrors.currentPassword = 'Current password is required';
    }

    if (!formData.newPassword.trim()) {
      newErrors.newPassword = 'New password is required';
    } else {
      const passwordValidation = validatePassword(formData.newPassword);
      if (!passwordValidation.isValid) {
        newErrors.newPassword = passwordValidation.errors[0];
      }
    }

    if (!formData.confirmPassword.trim()) {
      newErrors.confirmPassword = 'Please confirm your new password';
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (formData.currentPassword === formData.newPassword) {
      newErrors.newPassword = 'New password must be different from current password';
    }

    setErrors(newErrors);

    if (Object.values(newErrors).some(error => error !== '')) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/change-password-simple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
          confirmPassword: formData.confirmPassword,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 401) {
          throw new Error('You are not logged in. Please log in again.');
        } else if (response.status === 400) {
          throw new Error(result?.error || 'Invalid password or request data');
        } else if (response.status === 500) {
          throw new Error('Server error. Please try again later.');
        } else {
          throw new Error(result?.error || 'Failed to change password');
        }
      }

      setSuccessMessage('Password has been changed successfully!');
      setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      
      // Clear any existing errors
      setErrors({ currentPassword: '', newPassword: '', confirmPassword: '', general: '' });
    } catch (error) {
      console.error('Change password error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to change password';
      setErrors(prev => ({ ...prev, general: errorMessage }));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <RequireAuth>
    <div className="flex flex-col min-h-screen bg-white font-sans">
      {/* Mobile: My Account Plain Text with Dropdown Icon as Modal Trigger */}
      <div className="lg:hidden bg-white px-4 pt-4 shadow-sm">
        <div
          className="w-full flex items-center justify-between p-0 text-black font-semibold text-lg cursor-pointer mt-4 border-b border-gray-200 pb-3 hover:bg-gray-50 rounded-lg px-2 py-1 transition-colors"
          onClick={() => setIsAccountModalOpen(true)}
        >
          <div className="flex items-center space-x-2">
            <Icon icon="mdi:lock-outline" className="text-black w-5 h-5" />
            <span>Change Password</span>
          </div>
          <Icon icon="mdi:chevron-down" className="text-gray-400 w-6 h-6 ml-1" />
        </div>
      </div>
      {/* My Account Modal for Mobile */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end lg:hidden bg-black bg-opacity-40 overflow-y-auto" onClick={() => setIsAccountModalOpen(false)}>
          <div
            className="w-full bg-white animate-slideUp  relative shadow-lg max-h-screen overflow-y-auto"
            style={{ minHeight: '240px' }}
            onClick={e => e.stopPropagation()}
          >
            <button
              className="absolute top-3 right-4 text-gray-400 hover:text-gray-600 text-2xl"
              onClick={() => setIsAccountModalOpen(false)}
              aria-label="Close"
            >
              <Icon icon="mdi:close" />
            </button>
            <div className="font-bold text-xl mb-4 text-black text-center mt-4">My Account</div>
            <ul className="space-y-1 px-4 pb-6">
              <li>
                <span className="inline-flex items-center text-black font-semibold text-base">
                  My Account
                </span>
              </li>
              <li className="pl-8 py-3 hover:bg-gray-50 rounded-lg transition-colors duration-300">
                <Link href="/account#profile" className="text-black hover:text-gray-900 text-base block transition-colors">Profile</Link>
              </li>
              <li className="pl-8 py-3 hover:bg-gray-50 rounded-lg transition-colors duration-300">
                <Link href="/payments" className="text-black hover:text-gray-900 text-base block transition-colors">Payment Methods</Link>
              </li>
              <li className="pl-8 py-3 hover:bg-gray-50 rounded-lg transition-colors duration-300">
                <Link href="/addresses" className="text-black hover:text-gray-900 text-base block transition-colors">Addresses</Link>
              </li>
              <li className="pl-8 py-3 bg-gray-100 rounded-lg mb-2 transition-colors duration-300">
                <Link href="/changepassword" className="text-black font-semibold text-base block transition-colors">Change Password</Link>
              </li>
            </ul>
          </div>
        </div>
      )}
      {/* Main Content */}
<main className="flex-grow py-6 md:py-12">
  <div className="w-full max-w-screen-xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8">
    <div className="flex flex-col lg:flex-row lg:items-start gap-6 lg:gap-8">
      {/* Left Column - User Profile */}
      <div className="hidden lg:block w-full lg:w-80 bg-white rounded-2xl shadow-lg p-6 border border-gray-300 self-start">
        <div className="flex flex-col items-center">
          <div className="w-24 h-24 rounded-full overflow-hidden mb-6 border-4 border-black shadow-lg bg-gray-100 flex items-center justify-center relative">
            {profileImage ? (
              <img src={profileImage} alt="User" className="w-full h-full object-cover" />
            ) : (
              <Icon icon="lucide:user" className="w-10 h-10 text-gray-500" />
            )}
          </div>
          <div className="font-semibold text-xl mb-6 text-center text-gray-800">
            {`${userData.firstName} ${userData.lastName}`.trim() || 'User'}
          </div>
        
            <ul className="w-full space-y-2">
              <li className="flex items-center p-3 rounded-xl mb-2 bg-gray-100">
                <Icon icon="lucide:user" className="text-gray-600 mr-3 w-5 h-5" />
                <span className="text-gray-700 font-medium text-sm">My Account</span>
              </li>
              <li className="pl-4 py-2 hover:bg-gray-100 rounded-lg transition-all duration-200 group">
                <Link href="/account#profile" className="text-gray-600 hover:text-black text-sm block transition-colors flex items-center">
                  <Icon icon="mdi:account-outline" className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                  Profile
                </Link>
              </li>
              <li className="pl-4 py-2 hover:bg-gray-100 rounded-lg transition-all duration-200 group">
                <Link href="/payments" className="text-gray-600 hover:text-black text-sm block transition-colors flex items-center">
                  <Icon icon="mdi:credit-card-outline" className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                  Payment Methods
                </Link>
              </li>
              <li className="pl-4 py-2 hover:bg-gray-100 rounded-lg transition-all duration-200 group">
                <Link href="/addresses" className="text-gray-600 hover:text-black text-sm block transition-colors flex items-center">
                  <Icon icon="mdi:map-marker" className="w-4 h-4 mr-2" />
                  Addresses
                </Link>
              </li>
              <li className="pl-4 py-2 bg-black rounded-lg">
                <a href="/changepassword" className="text-white font-semibold text-sm block flex items-center">
                  <Icon icon="mdi:lock-outline" className="w-4 h-4 mr-2" />
                  Change Password
                </a>
              </li>
            </ul>
          
        </div>
      </div>
      {/* Right Column - Change Password Section */}
      <div className="w-full md:flex-1">
     
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-300">
          {/* Header */}
          <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
                <Icon icon="mdi:lock-reset" className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800">Change Password</h3>
                <p className="text-sm text-gray-500">Keep your account secure</p>
              </div>
            </div>
            {isLoading && (
              <Icon icon="mdi:loading" className="w-5 h-5 text-gray-400 animate-spin" />
            )}
          </div>

          {/* Password Form */}
          <div className="p-6">
            <form onSubmit={handleSubmit} className="max-w-md space-y-4">
              {/* Success Message */}
              {successMessage && (
                <div className="p-3 bg-green-100 border border-green-400 text-green-700 rounded-lg text-sm">
                  {successMessage}
                </div>
              )}

              {/* General Error Message */}
              {errors.general && (
                <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
                  {errors.general}
                </div>
              )}

              {/* Current Password */}
              <div>
                <label className="block text-sm font-medium mb-2 text-black">Current Password</label>
                <div className="relative">
                  <input 
                    type={showPasswords.currentPassword ? "text" : "password"}
                    name="currentPassword"
                    value={formData.currentPassword}
                    onChange={handleInputChange}
                    className={`w-full p-3 pr-12 border ${errors.currentPassword ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-gray-300 focus:border-gray-400 transition-colors`}
                    placeholder="Enter current password"
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('currentPassword')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-600 hover:text-black focus:outline-none transition-colors duration-200"
                  >
                    <Icon 
                      icon={showPasswords.currentPassword ? "mdi:eye-off" : "mdi:eye"} 
                      className="w-5 h-5" 
                    />
                  </button>
                </div>
                {errors.currentPassword && <p className="text-red-500 text-sm mt-1">{errors.currentPassword}</p>}
              </div>

              {/* New Password */}
              <div>
                <label className="block text-sm font-medium mb-2 text-black">New Password</label>
                <div className="relative">
                  <input 
                    type={showPasswords.newPassword ? "text" : "password"}
                    name="newPassword"
                    value={formData.newPassword}
                    onChange={handleInputChange}
                    className={`w-full p-3 pr-12 border ${errors.newPassword ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-gray-300 focus:border-gray-400 transition-colors`}
                    placeholder="Enter new password"
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('newPassword')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-600 hover:text-black focus:outline-none transition-colors duration-200"
                  >
                    <Icon 
                      icon={showPasswords.newPassword ? "mdi:eye-off" : "mdi:eye"} 
                      className="w-5 h-5" 
                    />
                  </button>
                </div>
                {errors.newPassword && <p className="text-red-500 text-sm mt-1">{errors.newPassword}</p>}
                <p className="text-gray-500 text-xs mt-1">
                  Password must be at least 8 characters with uppercase, lowercase, number, and special character.
                </p>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium mb-2 text-black">Confirm Password</label>
                <div className="relative">
                  <input 
                    type={showPasswords.confirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className={`w-full p-3 pr-12 border ${errors.confirmPassword ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-gray-300 focus:border-gray-400 transition-colors`}
                    placeholder="Confirm new password"
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('confirmPassword')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-600 hover:text-black focus:outline-none transition-colors duration-200"
                  >
                    <Icon 
                      icon={showPasswords.confirmPassword ? "mdi:eye-off" : "mdi:eye"} 
                      className="w-5 h-5" 
                    />
                  </button>
                </div>
                {errors.confirmPassword && <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>}
              </div>

              {/* Save Button */}
              <div className="pt-6">
                <button 
                  type="submit"
                  disabled={isLoading}
                  className={`px-6 py-3 bg-black hover:bg-gray-800 text-white text-sm font-semibold transition-all duration-200 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 ${isLoading ? 'opacity-75 cursor-not-allowed' : ''}`}
                >
                  {isLoading ? (
                    <>
                      <Icon icon="mdi:loading" className="animate-spin mr-2 inline" />
                      Updating...
                    </>
                  ) : (
                    'Update Password'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  </div>
</main>

    
    </div>
    </RequireAuth>
  );
};

export default ChangePass;