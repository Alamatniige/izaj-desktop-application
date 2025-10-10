'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Icon } from '@iconify/react';
import toast from 'react-hot-toast';
import { createClient } from '@supabase/supabase-js';

interface PasswordValidation {
  length: boolean;
  uppercase: boolean;
  lowercase: boolean;
  number: boolean;
  special: boolean;
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('code') || searchParams.get('token');
  const otpVerified = searchParams.get('otp_verified') === 'true';
  const phoneNumber = searchParams.get('phone') || '';
  const userId = searchParams.get('user_id') || '';
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null);
  const [tokenValidating, setTokenValidating] = useState(true);
  const [resetSuccess, setResetSuccess] = useState(false);

  // Password validation
  const passwordValidation: PasswordValidation = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };

  const isPasswordValid = Object.values(passwordValidation).every(Boolean);
  const doPasswordsMatch = password === confirmPassword && confirmPassword.length > 0;

  // Check session and handle auto-login
  useEffect(() => {
    const checkSession = async () => {
      try {
        // If coming from OTP verification, skip token validation
        if (otpVerified && userId) {
          setIsValidToken(true);
          setTokenValidating(false);
          return;
        }

        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        // Check if user is auto-logged in (from Supabase's reset flow)
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session check error:', error);
        }

        if (session?.user) {
          console.log('User is auto-logged in from reset link:', session.user.email);
          // User is auto-logged in, but we want them to manually reset
          // We'll keep them logged in but show the reset form
          setIsValidToken(true);
          setTokenValidating(false);
        } else if (!token) {
          // No session and no token
          setIsValidToken(false);
          setTokenValidating(false);
        } else {
          // Has token but no session - this means we need to verify the token
          // But we'll do this when the form is submitted to avoid consuming it early
          setIsValidToken(true);
          setTokenValidating(false);
        }
      } catch (err) {
        console.error('Session check failed:', err);
        setIsValidToken(false);
        setTokenValidating(false);
      }
    };

    checkSession();
  }, [token, otpVerified, userId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isPasswordValid) {
      toast.error('Password does not meet all requirements');
      return;
    }
    
    if (!doPasswordsMatch) {
      toast.error('Passwords do not match');
      return;
    }

    setIsLoading(true);
    
    try {
      // Handle OTP-based password reset
      if (otpVerified && userId) {
        console.log('Attempting OTP-based password reset for user:', userId);
        
        const response = await fetch('/api/auth/reset-password-otp', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: userId,
            phoneNumber: phoneNumber,
            password: password,
            confirmPassword: confirmPassword
          })
        });

        const result = await response.json();

        if (!response.ok) {
          console.error('OTP reset password API error:', result.error);
          toast.error(result.error || 'Failed to reset password. Please try again.');
          return;
        }

        console.log('Password reset successful via OTP');
        setResetSuccess(true);
        toast.success('✅ Password reset successfully! You can now log in with your new password.');
        
        setTimeout(() => {
          router.push('/login');
        }, 3000);
        return;
      }

      // Create Supabase client for email-based reset
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      // Check if user is already logged in (from auto-login)
      const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Session error:', sessionError);
      }

      if (currentSession?.user) {
        // User is auto-logged in, update password directly
        console.log('User is logged in, updating password for:', currentSession.user.email);
        
        const { error: updateError } = await supabase.auth.updateUser({
          password: password
        });

        if (updateError) {
          console.error('Password update error:', updateError);
          toast.error('Failed to update password. Please try again.');
          return;
        }

        console.log('Password updated successfully!');
        setResetSuccess(true);
        toast.success('✅ Password reset successfully! You can now log in with your new password.');
        
        setTimeout(() => {
          router.push('/login');
        }, 3000);
        return;
      }

      // If no session, try token verification
      if (!token) {
        toast.error('No reset token provided');
        return;
      }

      console.log('Attempting password reset with token:', token);

      // Use the API route for server-side token verification and password update
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: token,
          password: password,
          confirmPassword: confirmPassword
        })
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('Reset password API error:', result.error);
        toast.error(result.error || 'Failed to reset password. Please try again.');
        return;
      }

      console.log('Password reset successful via API');
      setResetSuccess(true);
      toast.success('✅ Password reset successfully! You can now log in with your new password.');
      
      // Wait a moment to show the success message, then redirect
      setTimeout(() => {
        router.push('/login');
      }, 3000);
      
    } catch (error) {
      console.error('Reset password error:', error);
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (tokenValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Validating reset token...</p>
          </div>
        </div>
      </div>
    );
  }

  if (resetSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 text-green-500 text-6xl">✅</div>
            <h2 className="mt-6 text-3xl font-bold text-gray-900">Password Reset Successful!</h2>
            <p className="mt-2 text-sm text-gray-600">
              Your password has been successfully reset. You can now log in with your new password.
            </p>
            <div className="mt-6">
              <button
                onClick={() => router.push('/login')}
                className="bg-black text-white px-6 py-3 rounded-md hover:bg-gray-800 transition-colors font-medium"
              >
                Go to Login
              </button>
            </div>
            <p className="mt-4 text-xs text-gray-500">
              Redirecting to login page in a few seconds...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!isValidToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <Icon icon="mdi:alert-circle" className="mx-auto h-12 w-12 text-red-500" />
            <h2 className="mt-6 text-3xl font-bold text-gray-900">Invalid Reset Link</h2>
            <p className="mt-2 text-sm text-gray-600">
              This password reset link is invalid or has expired. Please request a new one.
            </p>
            <div className="mt-6">
              <button
                onClick={() => router.push('/forgot-password')}
                className="bg-black text-white px-4 py-2 rounded-md hover:bg-gray-800 transition-colors"
              >
                Request New Reset Link
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
            Reset Your Password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {otpVerified 
              ? `Enter your new password below. Phone number +63${phoneNumber} has been verified.`
              : 'Enter your new password below'
            }
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                New Password
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none rounded-md relative block w-full px-3 py-2 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Enter new password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center hover:bg-gray-100 rounded-md transition-colors cursor-pointer z-10"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Password button clicked', showPassword);
                    setShowPassword(!showPassword);
                  }}
                >
                  {showPassword ? (
                    <span className="text-gray-400 hover:text-gray-600 text-sm font-medium">Hide</span>
                  ) : (
                    <span className="text-gray-400 hover:text-gray-600 text-sm font-medium">Show</span>
                  )}
                </button>
              </div>
            </div>

            {/* Password Requirements */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Password Requirements:</p>
              <div className="space-y-1">
                {[
                  { key: 'length', text: 'At least 8 characters' },
                  { key: 'uppercase', text: 'One uppercase letter' },
                  { key: 'lowercase', text: 'One lowercase letter' },
                  { key: 'number', text: 'One number' },
                  { key: 'special', text: 'One special character' },
                ].map(({ key, text }) => (
                  <div key={key} className="flex items-center space-x-2">
                    {passwordValidation[key as keyof PasswordValidation] ? (
                      <Icon icon="mdi:check-circle" className="h-4 w-4 text-green-500" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                    )}
                    <span className={`text-sm ${
                      passwordValidation[key as keyof PasswordValidation] 
                        ? 'text-green-600' 
                        : 'text-gray-500'
                    }`}>
                      {text}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Confirm Password Field */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm New Password
              </label>
              <div className="mt-1 relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="appearance-none rounded-md relative block w-full px-3 py-2 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Confirm new password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center hover:bg-gray-100 rounded-md transition-colors cursor-pointer z-10"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Confirm password button clicked', showConfirmPassword);
                    setShowConfirmPassword(!showConfirmPassword);
                  }}
                >
                  {showConfirmPassword ? (
                    <span className="text-gray-400 hover:text-gray-600 text-sm font-medium">Hide</span>
                  ) : (
                    <span className="text-gray-400 hover:text-gray-600 text-sm font-medium">Show</span>
                  )}
                </button>
              </div>
              {confirmPassword.length > 0 && !doPasswordsMatch && (
                <p className="mt-1 text-sm text-red-600">Passwords do not match</p>
              )}
              {doPasswordsMatch && (
                <p className="mt-1 text-sm text-green-600">Passwords match</p>
              )}
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading || !isPasswordValid || !doPasswordsMatch}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:bg-black disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Resetting Password...
                </div>
              ) : (
                'Reset Password'
              )}
            </button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={() => router.push('/login')}
              className="text-blackr:text-blue-500 text-sm font-medium"
            >
              Back to Login
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
