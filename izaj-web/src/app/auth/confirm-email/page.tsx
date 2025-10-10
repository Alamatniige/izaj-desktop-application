"use client";

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';

const ConfirmEmailPage: React.FC = () => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const confirmEmail = async () => {
      const token = searchParams.get('token');
      
      if (!token) {
        setStatus('error');
        setMessage('No confirmation token provided');
        return;
      }

      try {
        const response = await fetch('/api/auth/confirm-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        });

        const result = await response.json();

        if (response.ok) {
          setStatus('success');
          setMessage(result.message);
        } else {
          setStatus('error');
          setMessage(result.error || 'Failed to confirm email');
        }
      } catch (error) {
        setStatus('error');
        setMessage('An error occurred while confirming your email');
      }
    };

    confirmEmail();
  }, [searchParams]);

  const handleGoToLogin = () => {
    router.push('/login');
  };

  const handleGoHome = () => {
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        {status === 'loading' && (
          <>
            <div className="mb-6">
              <Icon 
                icon="mdi:loading" 
                className="w-16 h-16 text-blue-600 animate-spin mx-auto" 
              />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Confirming Your Email
            </h1>
            <p className="text-gray-600">
              Please wait while we confirm your email address...
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="mb-6">
              <Icon 
                icon="mdi:check-circle" 
                className="w-16 h-16 text-green-600 mx-auto" 
              />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Email Confirmed!
            </h1>
            <p className="text-gray-600 mb-6">
              {message}
            </p>
            <div className="space-y-3">
              <button
                onClick={handleGoToLogin}
                className="w-full bg-black text-white py-3 px-6 rounded-lg font-medium hover:bg-gray-800 transition-colors"
              >
                Go to Login
              </button>
              <button
                onClick={handleGoHome}
                className="w-full bg-gray-200 text-gray-800 py-3 px-6 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                Go to Home
              </button>
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="mb-6">
              <Icon 
                icon="mdi:alert-circle" 
                className="w-16 h-16 text-red-600 mx-auto" 
              />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Confirmation Failed
            </h1>
            <p className="text-gray-600 mb-6">
              {message}
            </p>
            <div className="space-y-3">
              <button
                onClick={handleGoToLogin}
                className="w-full bg-black text-white py-3 px-6 rounded-lg font-medium hover:bg-gray-800 transition-colors"
              >
                Go to Login
              </button>
              <button
                onClick={handleGoHome}
                className="w-full bg-gray-200 text-gray-800 py-3 px-6 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                Go to Home
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ConfirmEmailPage;
