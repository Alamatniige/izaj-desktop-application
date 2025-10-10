'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Icon } from '@iconify/react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';

export default function VerifyOTPPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phoneNumber = searchParams.get('phone') || '';
  
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [verificationSuccess, setVerificationSuccess] = useState(false);
  const [error, setError] = useState('');
  
  const otpInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (otpInputRef.current) {
      otpInputRef.current.focus();
    }
  }, []);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setOtp(value);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: phoneNumber,
          otp: otp
        })
      });

      const result = await response.json();

      if (response.ok) {
        setVerificationSuccess(true);
        toast.success('OTP verified successfully!');
        
        // Redirect to reset password page with OTP token
        setTimeout(() => {
          router.push(`/reset-password?otp_verified=true&phone=${encodeURIComponent(phoneNumber)}&user_id=${result.userId}`);
        }, 2000);
      } else {
        setError(result.error || 'Invalid or expired OTP');
        setOtp('');
      }
    } catch (error) {
      console.error('OTP verification error:', error);
      setError('Failed to verify OTP. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendCooldown > 0) return;

    setResendLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: phoneNumber })
      });

      const result = await response.json();

      if (response.ok) {
        toast.success('OTP code sent successfully!');
        setResendCooldown(60); // 60 seconds cooldown
      } else {
        setError(result.error || 'Failed to resend OTP');
      }
    } catch (error) {
      console.error('Resend OTP error:', error);
      setError('Failed to resend OTP. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  if (verificationSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 text-green-500 text-6xl">✅</div>
            <h2 className="mt-6 text-3xl font-bold text-gray-900">OTP Verified!</h2>
            <p className="mt-2 text-sm text-gray-600">
              Your phone number has been verified. Redirecting to password reset...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          {/* Left Section - Title */}
          <div className="space-y-8">
            <h1 className="text-4xl font-bold text-black leading-tight">
              Verify your phone number
            </h1>
            <p className="text-lg text-gray-600">
              We've sent a 6-digit code to{' '}
              <span className="font-medium text-black">+63{phoneNumber}</span>
            </p>
            <p className="text-sm text-gray-500">
              Didn't receive the code?{' '}
              <button
                onClick={handleResendOTP}
                disabled={resendLoading || resendCooldown > 0}
                className="text-black hover:underline font-medium disabled:opacity-50"
              >
                {resendLoading ? 'Sending...' : 
                 resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 
                 'Resend code'}
              </button>
            </p>
          </div>

          {/* Right Section - Form */}
          <div className="bg-white max-w-lg">
            <p className="text-black text-base mb-8 leading-relaxed font-bold">
              Enter the verification code sent to your phone.
            </p>

            {error && (
              <div className="mb-6 text-sm text-red-600 bg-red-50 p-4 rounded-lg border border-red-200">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* OTP Input */}
              <div className="space-y-2">
                <label htmlFor="otp-code" className="block text-sm font-medium text-black">
                  Verification Code
                </label>
                <input
                  ref={otpInputRef}
                  type="text"
                  id="otp-code"
                  name="otp"
                  value={otp}
                  onChange={handleOtpChange}
                  className="w-full px-4 py-4 text-center text-2xl font-mono border-2 border-gray-300 bg-white text-black placeholder-gray-400 focus:ring-2 focus:ring-black focus:border-black transition-all duration-200 rounded-none tracking-widest"
                  placeholder="000000"
                  maxLength={6}
                />
                <p className="text-xs text-gray-500 text-center">
                  Enter the 6-digit code
                </p>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || otp.length !== 6}
                className="w-full bg-black text-white py-4 px-6 text-base font-medium hover:bg-gray-800 transition-all duration-300 flex items-center justify-center disabled:opacity-50 rounded-none"
              >
                {isLoading ? (
                  <>
                    <Icon icon="mdi:loading" className="w-5 h-5 animate-spin mr-3" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <span>Verify Code</span>
                )}
              </button>

              {/* Back to Forgot Password */}
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => router.push('/forgot-password')}
                  className="text-sm text-gray-600 hover:text-gray-800 transition-colors"
                >
                  ← Back to forgot password
                </button>
              </div>
            </form>

            {/* Help Text */}
            <div className="mt-8 p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Having trouble?</h4>
              <ul className="text-xs text-gray-600 space-y-1">
                <li>• Check your SMS messages</li>
                <li>• Make sure you have a good signal</li>
                <li>• The code expires in 10 minutes</li>
                <li>• Contact support if you need help</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
