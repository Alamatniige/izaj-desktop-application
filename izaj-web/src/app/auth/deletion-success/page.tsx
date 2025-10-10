"use client";

import React, { useEffect } from 'react';
import Link from 'next/link';
import { Icon } from '@iconify/react';

export default function DeletionSuccessPage() {
  // Clear all user data from localStorage and sessionStorage
  useEffect(() => {
    // Check if we've already cleared data to prevent infinite reload
    const hasCleared = sessionStorage.getItem('deletion_cleared');
    
    if (!hasCleared) {
      // Clear user data
      localStorage.removeItem('user');
      sessionStorage.removeItem('user');
      localStorage.removeItem('rememberMe');
      
      // Clear cart data
      localStorage.removeItem('cart');
      
      // Clear recently viewed
      localStorage.removeItem('izaj_recently_viewed');
      
      // Clear any profile images
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('profileImage_') || key.startsWith('address_') || key.startsWith('ewallet_')) {
          localStorage.removeItem(key);
        }
      });
      
      // Mark as cleared before reload to prevent infinite loop
      sessionStorage.setItem('deletion_cleared', 'true');
      
      // Force reload to clear any cached state
      window.location.reload();
    }
  }, []);
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white border border-gray-200 shadow-lg p-8 text-center">
        <div className="mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 rounded-full mb-4">
            <Icon icon="mdi:check-circle" className="w-12 h-12 text-gray-600" />
          </div>
          <h1 className="text-3xl font-bold text-black mb-2" style={{ fontFamily: "'Avenir Next', sans-serif" }}>
            Account Deleted
          </h1>
          <p className="text-gray-600 text-lg">
            Your account has been successfully deleted
          </p>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6">
          <p className="text-gray-700 mb-2">
            We're sorry to see you go! Your account and all associated data have been permanently removed from our system.
          </p>
          <p className="text-gray-600 text-sm">
            If you change your mind in the future, you're always welcome to create a new account with us.
          </p>
        </div>

        <div className="space-y-3">
          <Link
            href="/"
            className="block w-full bg-black hover:bg-gray-800 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
          >
            Return to Homepage
          </Link>
          <Link
            href="/signup"
            className="block w-full bg-white hover:bg-gray-50 text-black font-semibold py-3 px-6 rounded-lg border border-gray-300 transition-colors duration-200"
          >
            Create New Account
          </Link>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            Thank you for being part of the IZAJ family!
          </p>
        </div>
      </div>
    </div>
  );
}

