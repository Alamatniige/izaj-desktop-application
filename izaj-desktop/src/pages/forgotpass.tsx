import { Icon } from '@iconify/react';
import { useState } from 'react';
import { useLogin } from '../hooks/useLogin';

interface ForgotPassProps {
  onLogin: (session: unknown) => void;
  handleNavigation: (page: 'LOGIN' | 'FORGOTPASS') => void;
}

export default function ForgotPass({ onLogin, handleNavigation }: ForgotPassProps) {
  const {
    email,
    setEmail,
    error,
    success,
    handleForgotPassword,
  } = useLogin({ onLogin });

  const [loading, setLoading] = useState(false);

  // Wrap handleForgotPassword to add loading state
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await handleForgotPassword(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 via-slate-50 to-gray-100 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-100/20 to-indigo-100/20 dark:from-blue-900/10 dark:to-indigo-900/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-slate-100/20 to-gray-100/20 dark:from-slate-800/10 dark:to-gray-800/10 rounded-full blur-3xl"></div>
      </div>
      
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

        <div className="text-gray-600 dark:text-slate-400 mb-6 text-sm font-medium" style={{ fontFamily: "'Jost', sans-serif" }}>Forgot Your Password?</div>

        <form onSubmit={onSubmit} className="w-full space-y-4">
          {error && (
            <div className="mb-4 text-red-600 text-sm text-center bg-red-50 rounded-xl py-3 px-4 border border-red-200 shadow-sm" style={{ fontFamily: "'Jost', sans-serif" }}>
              <Icon icon="mdi:alert-circle-outline" className="inline mr-2 text-red-500" />
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 text-green-600 text-sm text-center bg-green-50 rounded-xl py-3 px-4 border border-green-200 shadow-sm" style={{ fontFamily: "'Jost', sans-serif" }}>
              <Icon icon="mdi:check-circle-outline" className="inline mr-2 text-green-500" />
              {success}
            </div>
          )}

          <div className="space-y-2">
            <label className="block text-gray-700 mb-2 font-semibold text-sm" style={{ fontFamily: "'Jost', sans-serif" }}>Email Address</label>
            <div className="relative group">
              <Icon icon="mdi:email-outline" className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-gray-700 transition-colors" />
              <input
                type="email"
                disabled={loading}
                className="w-full pl-12 pr-4 py-3 border border-gray-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-amber-500 focus:border-gray-400 dark:focus:border-amber-500 bg-gray-50/50 dark:bg-slate-700/50 shadow-sm hover:shadow-md transition-all duration-200 placeholder-gray-400 dark:placeholder-slate-400 text-gray-900 dark:text-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ fontFamily: "'Jost', sans-serif" }}
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoFocus
                placeholder="admin@izaj.com"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gray-800 dark:bg-amber-600 text-white py-3 rounded-xl font-semibold hover:bg-gray-700 dark:hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-amber-500 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:translate-y-0 mt-4 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            style={{ fontFamily: "'Jost', sans-serif" }}
          >
            {loading ? (
              <>
                <Icon icon="mdi:loading" className="inline mr-2 text-lg animate-spin" />
                Sending Reset Link...
              </>
            ) : (
              <>
                <Icon icon="mdi:email-send" className="inline mr-2 text-lg" />
                Send Reset Link
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button 
            onClick={e => {
              e.preventDefault();
              handleNavigation('LOGIN');
            }}
            className="text-gray-600 hover:text-gray-700 font-medium hover:underline transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2 rounded px-2 py-1 text-sm"
            style={{ fontFamily: "'Jost', sans-serif" }}
          >
            ← Back to Login
          </button>
        </div>

        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-slate-700">
          <div className="text-xs text-gray-500 dark:text-slate-400 text-center">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <div className="w-2 h-2 bg-gray-400 dark:bg-slate-500 rounded-full"></div>
              <span className="font-medium" style={{ fontFamily: "'Jost', sans-serif" }}>Secure Admin Access</span>
              <div className="w-2 h-2 bg-gray-400 dark:bg-slate-500 rounded-full"></div>
            </div>
            <div style={{ fontFamily: "'Jost', sans-serif" }}>© {new Date().getFullYear()} IZAJ Lighting Centre. All rights reserved.</div>
          </div>
        </div>
      </div>
    </div>
  );
}