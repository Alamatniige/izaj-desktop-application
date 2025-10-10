"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Icon } from '@iconify/react';
import { useRouter } from 'next/navigation';

const ForgotPasswordPage: React.FC = () => {
  const [formData, setFormData] = useState({
    email: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [resetMethod, setResetMethod] = useState<'email' | 'otp'>('email');
  const emailInputRef = useRef<HTMLInputElement>(null);
  
  const router = useRouter();

  useEffect(() => {
    if (emailInputRef.current) {
      emailInputRef.current.focus();
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) {
      newErrors.email = resetMethod === 'email' ? 'Email is required' : 'Phone number is required';
    } else if (resetMethod === 'email') {
      const emailOk = /\S+@\S+\.\S+/.test(formData.email);
      if (!emailOk) {
        newErrors.email = 'Enter a valid email address';
      }
    } else {
      const digits = formData.email.replace(/\D/g, '');
      const phoneOk = /^\d{10,15}$/.test(digits);
      if (!phoneOk) {
        newErrors.email = 'Enter a valid phone number';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setMessage('');
    
    try {
      if (resetMethod === 'email') {
        // Email reset flow
        const response = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier: formData.email.trim() })
        });
        
        const result = await response.json();
        
        if (response.ok) {
          setMessage(result.message || 'Password reset link sent! Check your email for further instructions.');
          setFormData({ email: '' });
        } else {
          setMessage(result.error || 'Failed to send reset link');
        }
      } else {
        // OTP reset flow
        const response = await fetch('/api/auth/send-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phoneNumber: formData.email.trim() })
        });
        
        const result = await response.json();
        
        if (response.ok) {
          setMessage(result.message || 'OTP code sent! Check your phone for the verification code.');
          // Redirect to OTP verification page
          router.push(`/verify-otp?phone=${encodeURIComponent(formData.email.trim())}`);
        } else {
          setMessage(result.error || 'Failed to send OTP');
        }
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      setMessage('Failed to send reset link. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          {/* Left Section - Title */}
          <div className="space-y-8">
            <h1 className="text-4xl font-bold text-black leading-tight">
              Reset your password
            </h1>
            <p className="text-lg text-gray-600">
              Remember your password?{' '}
              <button
                onClick={() => router.push('/login')}
                className="text-black hover:underline font-medium"
              >
                Log in here
              </button>
            </p>
          </div>

          {/* Right Section - Form */}
          <div className="bg-white max-w-lg">
            <p className="text-black text-base mb-6 leading-relaxed font-bold">
              Choose how you'd like to reset your password.
            </p>

            {/* Reset Method Selection */}
            <div className="mb-6">
              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={() => setResetMethod('email')}
                  className={`flex-1 py-3 px-4 text-sm font-medium rounded-md transition-colors ${
                    resetMethod === 'email'
                      ? 'bg-black text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Icon icon="mdi:email" className="w-4 h-4 inline mr-2" />
                  Email
                </button>
                <button
                  type="button"
                  onClick={() => setResetMethod('otp')}
                  className={`flex-1 py-3 px-4 text-sm font-medium rounded-md transition-colors ${
                    resetMethod === 'otp'
                      ? 'bg-black text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Icon icon="mdi:cellphone" className="w-4 h-4 inline mr-2" />
                  Phone OTP
                </button>
              </div>
            </div>

            <p className="text-gray-600 text-sm mb-8">
              {resetMethod === 'email' 
                ? 'Enter your email address and we\'ll send you a reset link.'
                : 'Enter your phone number and we\'ll send you a verification code.'
              }
            </p>

            {message && (
              <div className={`mb-6 text-sm p-4 rounded-lg ${
                message.includes('sent') || message.includes('successfully') 
                  ? 'text-green-700 bg-green-50 border border-green-200' 
                  : 'text-red-600 bg-red-50 border border-red-200'
              }`}>
                {message}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email or Phone */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-black">
                  {resetMethod === 'email' ? 'Email Address' : 'Phone Number'}
                </label>
                <div className="relative">
                  {resetMethod === 'otp' && (
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <span className="text-gray-600 text-sm font-medium">+63</span>
                    </div>
                  )}
                  <input
                    type={resetMethod === 'email' ? 'email' : 'tel'}
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    ref={emailInputRef}
                    className={`w-full ${resetMethod === 'otp' ? 'pl-16' : 'pl-4'} pr-4 py-4 text-base border-2 bg-white text-black placeholder-gray-400 ${
                      errors.email ? 'border-red-500' : 'border-gray-300'
                    } focus:ring-2 focus:ring-black focus:border-black transition-all duration-200 rounded-none`}
                    placeholder={resetMethod === 'email' ? 'Enter your email address' : '9XXXXXXXXX'}
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-black text-white py-4 px-6 text-base font-medium hover:bg-gray-800 transition-all duration-300 flex items-center justify-center disabled:opacity-50 rounded-none"
              >
                {isLoading ? (
                  <>
                    <Icon icon="mdi:loading" className="w-5 h-5 animate-spin mr-3" />
                    <span>
                      {resetMethod === 'email' ? 'Sending reset link...' : 'Sending OTP...'}
                    </span>
                  </>
                ) : (
                  <span>
                    {resetMethod === 'email' ? 'Send Reset Link' : 'Send OTP Code'}
                  </span>
                )}
              </button>

              {/* Back to Login */}
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => router.push('/login')}
                  className="text-sm text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Back to Login
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
