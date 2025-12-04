import { Icon } from '@iconify/react';
import { useState, useEffect } from 'react';
import { useLogin } from '../hooks/useLogin';
import { Session } from '@supabase/supabase-js';
import { useVersionCheck } from '../hooks/useVersionCheck';

interface LoginProps {
  onLogin: (session: Session) => void;
  handleNavigation: (page: 'LOGIN' | 'FORGOTPASS') => void;
}

export default function Login({ onLogin, handleNavigation }: LoginProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [inviteAccepted, setInviteAccepted] = useState(false);
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);
  const [showVersionMessage, setShowVersionMessage] = useState(false);
  
  const {
    email,
    setEmail,
    password,
    setPassword,
    rememberMe,
    setRememberMe,
    error,
    success,
    isLoading,
    handleSubmit,
  } = useLogin({ onLogin });

  const { versionInfo, isChecking, error: versionError, checkForUpdates } = useVersionCheck();

  // Show appropriate message based on version check result
  useEffect(() => {
    if (versionInfo !== null) {
      setShowVersionMessage(true);
      if (versionInfo.updateAvailable) {
        setShowUpdateBanner(true);
      }
    }
  }, [versionInfo]);

  const handleCheckVersion = async () => {
    setShowUpdateBanner(false);
    setShowVersionMessage(false);
    await checkForUpdates();
  };

  useEffect(() => {
    // Check if user just accepted an invite (has tokens in URL)
    const urlParams = new URLSearchParams(window.location.search);
    const hash = window.location.hash;
    const hashParams = new URLSearchParams(hash.substring(1));
    const accessToken = hashParams.get('access_token') || urlParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token') || urlParams.get('refresh_token');
    const type = hashParams.get('type') || urlParams.get('type');
    
    // If we have tokens and we're on login page, redirect to accept-invite page
    // This handles the case where Supabase redirects to login instead of accept-invite
    // BUT only if we haven't already processed the invite (check localStorage to prevent loop)
    if (accessToken && refreshToken && window.location.pathname === '/') {
      const inviteProcessed = localStorage.getItem('invite_processed');
      const inviteToken = `${accessToken}_${refreshToken}`;
      
      // If this exact invite was already processed, don't redirect again
      if (inviteProcessed === inviteToken) {
        console.log('🔍 [Login] Invite already processed, skipping redirect');
        // Clear URL parameters
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      }
      
      console.log('🔍 [Login] Invite tokens detected, redirecting to accept-invite page');
      // Mark that we're processing this invite
      localStorage.setItem('invite_processing', inviteToken);
      // Redirect to accept-invite page with tokens
      const search = new URLSearchParams();
      search.set('access_token', accessToken);
      search.set('refresh_token', refreshToken);
      if (type) search.set('type', type);
      window.location.href = `/accept-invite?${search.toString()}${hash ? `#${hash.substring(1)}` : ''}`;
      return;
    }
    
    // If tokens are present but we're not redirecting, show success message
    if (accessToken && refreshToken) {
      setInviteAccepted(true);
      // Clear URL parameters after detecting
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleDownloadUpdate = () => {
    if (versionInfo?.downloadUrl) {
      window.open(versionInfo.downloadUrl, '_blank');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 via-slate-50 to-gray-100 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-100/20 to-indigo-100/20 dark:from-blue-900/10 dark:to-indigo-900/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-slate-100/20 to-gray-100/20 dark:from-slate-800/10 dark:to-gray-800/10 rounded-full blur-3xl"></div>
      </div>

      {/* Version Check Messages */}
      {showVersionMessage && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-lg px-4">
          {/* Update Available Banner */}
          {versionInfo?.updateAvailable && showUpdateBanner && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 shadow-lg mb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  <Icon 
                    icon="mdi:update" 
                    className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" 
                  />
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1" style={{ fontFamily: "'Jost', sans-serif" }}>
                      Update Available
                    </h3>
                    <p className="text-xs text-blue-700 dark:text-blue-300 mb-2" style={{ fontFamily: "'Jost', sans-serif" }}>
                      A new version ({versionInfo.latestVersion}) is available. You're currently on {versionInfo.currentVersion}.
                    </p>
                    {versionInfo.downloadUrl && (
                      <button
                        onClick={handleDownloadUpdate}
                        className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg font-medium transition-colors"
                        style={{ fontFamily: "'Jost', sans-serif" }}
                      >
                        Download Update
                      </button>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowUpdateBanner(false);
                    setShowVersionMessage(false);
                  }}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 transition-colors ml-2"
                >
                  <Icon icon="mdi:close" className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Up to Date Message */}
          {versionInfo && !versionInfo.updateAvailable && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 shadow-lg">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  <Icon 
                    icon="mdi:check-circle" 
                    className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" 
                  />
                  <div className="flex-1">
                    <p className="text-sm text-green-900 dark:text-green-100" style={{ fontFamily: "'Jost', sans-serif" }}>
                      Your application is on the latest version ({versionInfo.currentVersion})
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowVersionMessage(false)}
                  className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200 transition-colors ml-2"
                >
                  <Icon icon="mdi:close" className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Error Message */}
          {versionError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 shadow-lg">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  <Icon 
                    icon="mdi:alert-circle" 
                    className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" 
                  />
                  <div className="flex-1">
                    <p className="text-sm text-red-900 dark:text-red-100" style={{ fontFamily: "'Jost', sans-serif" }}>
                      {versionError}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowVersionMessage(false)}
                  className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 transition-colors ml-2"
                >
                  <Icon icon="mdi:close" className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Loading State */}
      {isChecking && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-lg px-4">
          <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-lg">
            <div className="flex items-center space-x-3">
              <Icon 
                icon="mdi:loading" 
                className="w-5 h-5 text-gray-600 dark:text-gray-400 animate-spin" 
              />
              <p className="text-sm text-gray-700 dark:text-gray-300" style={{ fontFamily: "'Jost', sans-serif" }}>
                Checking for updates...
              </p>
            </div>
          </div>
        </div>
      )}
      
      <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-3xl shadow-xl border border-gray-200/50 dark:border-slate-700/50 px-12 pt-4 pb-8 w-full max-w-lg flex flex-col items-center relative z-10">
        <div className="mt-1 mb-3 flex flex-col items-center">
          {/* Logo */}
          <img
            src="/izaj.jpg"
            alt="IZAJ Logo"
            className="w-28 h-28 rounded-full object-cover shadow-xl mb-4"
          />
          <span className="text-gray-600 dark:text-slate-400 font-semibold tracking-[0.3em] text-xs mb-1" style={{ fontFamily: "'Jost', sans-serif" }}>
            ADMIN PANEL
          </span>
          <div className="w-16 h-0.5 bg-gradient-to-r from-gray-300 to-slate-300 dark:from-slate-600 dark:to-slate-500 rounded-full"></div>
        </div>

        <div className="text-gray-600 dark:text-slate-400 mb-6 text-sm font-medium" style={{ fontFamily: "'Jost', sans-serif" }}>Welcome back! Please sign in to continue</div>

        <form onSubmit={handleSubmit} className="w-full space-y-4">
          {inviteAccepted && (
            <div className="mb-4 text-green-600 text-sm text-center bg-green-50 rounded-xl py-3 px-4 border border-green-200 shadow-sm" style={{ fontFamily: "'Jost', sans-serif" }}>
              <Icon icon="mdi:check-circle-outline" className="inline mr-2 text-green-500" />
              Invitation accepted! Please sign in with your email and password.
            </div>
          )}

          {success && (
            <div className="mb-4 text-green-600 text-sm text-center bg-green-50 rounded-xl py-3 px-4 border border-green-200 shadow-sm" style={{ fontFamily: "'Jost', sans-serif" }}>
              <Icon icon="mdi:check-circle-outline" className="inline mr-2 text-green-500" />
              {success}
            </div>
          )}

          {error && (
            <div className="mb-4 text-red-600 text-sm text-center bg-red-50 rounded-xl py-3 px-4 border border-red-200 shadow-sm" style={{ fontFamily: "'Jost', sans-serif" }}>
              <Icon icon="mdi:alert-circle-outline" className="inline mr-2 text-red-500" />
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="block text-gray-700 mb-2 font-semibold text-sm" style={{ fontFamily: "'Jost', sans-serif" }}>Email Address</label>
            <div className="relative group">
              <Icon icon="mdi:email-outline" className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-gray-700 transition-colors" />
              <input
                type="email"
                disabled={isLoading}
                className="w-full pl-12 pr-4 py-3 border border-gray-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-amber-500 focus:border-gray-400 dark:focus:border-amber-500 bg-gray-50/50 dark:bg-slate-700/50 shadow-sm hover:shadow-md transition-all duration-200 placeholder-gray-400 dark:placeholder-slate-400 text-gray-900 dark:text-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ fontFamily: "'Jost', sans-serif" }}
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoFocus
                placeholder="Enter your email address"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-gray-700 mb-2 font-semibold text-sm" style={{ fontFamily: "'Jost', sans-serif" }}>Password</label>
            <div className="relative group">
              <Icon icon="mdi:lock-outline" className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-gray-700 transition-colors" />
              <input
                type={showPassword ? "text" : "password"}
                disabled={isLoading}
                className="w-full pl-12 pr-12 py-3 border border-gray-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-amber-500 focus:border-gray-400 dark:focus:border-amber-500 bg-gray-50/50 dark:bg-slate-700/50 shadow-sm hover:shadow-md transition-all duration-200 placeholder-gray-400 dark:placeholder-slate-400 text-gray-900 dark:text-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ fontFamily: "'Jost', sans-serif" }}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter your password"
              />
              <button
                type="button"
                disabled={isLoading}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Icon 
                  icon={showPassword ? "mdi:eye-off-outline" : "mdi:eye-outline"} 
                  className="w-5 h-5" 
                />
              </button>
            </div>
          </div>

          <div className="flex flex-row justify-between items-center pt-2">
            <div className="flex items-center group">
              <input
                id="remember"
                type="checkbox"
                disabled={isLoading}
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
                className="w-4 h-4 text-gray-600 bg-gray-50 border-gray-300 rounded focus:ring-gray-500 focus:ring-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <label htmlFor="remember" className="ml-3 text-sm text-gray-600 font-medium group-hover:text-gray-700 transition-colors cursor-pointer" style={{ fontFamily: "'Jost', sans-serif" }}>
                Remember Me
              </label>
            </div>
            <div className="text-right">
              <button 
                type="button"
                disabled={isLoading}
                onClick={e => {
                  e.preventDefault();
                  handleNavigation('FORGOTPASS');
                }}
                className="text-sm text-gray-600 hover:text-gray-700 font-medium hover:underline transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2 rounded px-1 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ fontFamily: "'Jost', sans-serif" }}
              >
                Forgot Password?
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gray-800 dark:bg-amber-600 text-white py-3 rounded-xl font-semibold hover:bg-gray-700 dark:hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-amber-500 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:translate-y-0 mt-4 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            style={{ fontFamily: "'Jost', sans-serif" }}
          >
            {isLoading ? (
              <>
                <Icon icon="mdi:loading" className="inline mr-2 text-lg animate-spin" />
                Signing In...
              </>
            ) : (
              <>
                <Icon icon="mdi:login" className="inline mr-2 text-lg" />
                Sign In
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-slate-700">
          <div className="text-xs text-gray-500 dark:text-slate-400 text-center">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <div className="w-2 h-2 bg-gray-400 dark:bg-slate-500 rounded-full"></div>
              <span className="font-medium" style={{ fontFamily: "'Jost', sans-serif" }}>Secure Admin Access</span>
              <div className="w-2 h-2 bg-gray-400 dark:bg-slate-500 rounded-full"></div>
            </div>
            <div className="mb-2" style={{ fontFamily: "'Jost', sans-serif" }}>
              © {new Date().getFullYear()} IZAJ Lighting Centre. All rights reserved.
            </div>
            <button
              onClick={handleCheckVersion}
              disabled={isChecking}
              className="text-xs text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 font-medium hover:underline transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2 rounded px-1 py-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:no-underline flex items-center gap-1 mx-auto"
              style={{ fontFamily: "'Jost', sans-serif" }}
            >
              {isChecking ? (
                <>
                  <Icon icon="mdi:loading" className="w-3 h-3 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <Icon icon="mdi:update" className="w-3 h-3" />
                  Check for latest versions
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
