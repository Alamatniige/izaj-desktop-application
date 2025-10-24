import { Icon } from '@iconify/react';
import { useState } from 'react';
import { useLogin } from '../hooks/useLogin';

interface LoginProps {
  onLogin: (session: any) => void;
  handleNavigation: (page: 'LOGIN' | 'FORGOTPASS') => void;
}

export default function Login({ onLogin, handleNavigation }: LoginProps) {
  const [showPassword, setShowPassword] = useState(false);
  
  const {
    email,
    setEmail,
    password,
    setPassword,
    rememberMe,
    setRememberMe,
    error,
    isLoading,
    handleSubmit,
  } = useLogin({ onLogin });

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 via-slate-50 to-gray-100 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-100/20 to-indigo-100/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-slate-100/20 to-gray-100/20 rounded-full blur-3xl"></div>
      </div>
      
      <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl border border-gray-200/50 px-12 py-8 w-full max-w-lg flex flex-col items-center relative z-10">
        {/* Logo */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2">
          <img
            src="/izaj.jpg"
            alt="IZAJ Logo"
            className="w-24 h-24 rounded-full object-cover shadow-xl"
          />
        </div>

        <div className="mt-12 mb-3 flex flex-col items-center">
          <h2
            className="text-4xl font-bold mb-1 text-gray-800"
            style={{
              fontFamily: "'Playfair Display', serif",
              letterSpacing: '8px',
              textShadow: '-2px 0px 2px rgba(0, 0, 0, 0.5)',
            }}
          >
            IZAJ
          </h2>
          <span className="text-gray-600 font-semibold tracking-[0.3em] text-xs mb-1" style={{ fontFamily: "'Jost', sans-serif" }}>
            ADMIN PANEL
          </span>
          <div className="w-16 h-0.5 bg-gradient-to-r from-gray-300 to-slate-300 rounded-full"></div>
        </div>

        <div className="text-gray-600 mb-6 text-sm font-medium" style={{ fontFamily: "'Jost', sans-serif" }}>Welcome back! Please sign in to continue</div>

        <form onSubmit={handleSubmit} className="w-full space-y-4">
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
                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-gray-400 bg-gray-50/50 shadow-sm hover:shadow-md transition-all duration-200 placeholder-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ fontFamily: "'Jost', sans-serif" }}
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoFocus
                placeholder="admin@izaj.com"
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
                className="w-full pl-12 pr-12 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-gray-400 bg-gray-50/50 shadow-sm hover:shadow-md transition-all duration-200 placeholder-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
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
            className="w-full bg-gray-800 text-white py-3 rounded-xl font-semibold hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:translate-y-0 mt-4 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
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

        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="text-xs text-gray-500 text-center">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
              <span className="font-medium" style={{ fontFamily: "'Jost', sans-serif" }}>Secure Admin Access</span>
              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
            </div>
            <div style={{ fontFamily: "'Jost', sans-serif" }}>© {new Date().getFullYear()} IZAJ Lighting Centre. All rights reserved.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
