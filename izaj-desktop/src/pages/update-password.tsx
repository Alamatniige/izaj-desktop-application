import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { authService } from '../services/authService';
import { useNavigate } from 'react-router-dom';

const UpdatePassword: React.FC = () => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        // Extract tokens from URL hash or query parameters
        const urlParams = new URLSearchParams(window.location.search);
        const hash = window.location.hash;
        
        // Try to get tokens from URL hash (Supabase format)
        const hashParams = new URLSearchParams(hash.substring(1));
        const accessToken = hashParams.get('access_token') || urlParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token') || urlParams.get('refresh_token');
        // const type = hashParams.get('type') || urlParams.get('type'); // Supabase includes type=recovery (unused for now)
        
        // Check if we're in a browser (not Tauri app) and have tokens
        // Automatically redirect to deep link to open in desktop app
        const isTauri = typeof window !== 'undefined' && (window as any).__TAURI__ !== undefined;
        
        if (!isTauri && accessToken && refreshToken) {
            // Immediately redirect to deep link to open in desktop app
            const type = hashParams.get('type') || urlParams.get('type');
            const deepLink = `izaj://update-password#access_token=${encodeURIComponent(accessToken)}&refresh_token=${encodeURIComponent(refreshToken)}${type ? `&type=${encodeURIComponent(type)}` : ''}`;
            
            // Try to redirect to deep link
            // This will open the desktop app if installed
            window.location.href = deepLink;
            
            // Show a message that we're redirecting to the app
            setSuccess('Opening IZAJ app... If the app doesn\'t open, please make sure it is installed.');
            
            // If deep link doesn't work after a short delay, the user can still use the web form
            // The form will remain functional as a fallback
        }
        
        if (!accessToken || !refreshToken) {
            setError('Invalid or missing reset link. Please request a new password reset.');
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters long.');
            return;
        }

        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const urlParams = new URLSearchParams(window.location.search);
            const hash = window.location.hash;
            
            // Try to get tokens from URL hash (Supabase format)
            const hashParams = new URLSearchParams(hash.substring(1));
            const accessToken = hashParams.get('access_token') || urlParams.get('access_token');
            const refreshToken = hashParams.get('refresh_token') || urlParams.get('refresh_token');

            if (!accessToken || !refreshToken) {
                throw new Error('Invalid or missing reset link');
            }

            await authService.updatePassword(password, accessToken, refreshToken);
            setSuccess('Password updated successfully! Redirecting to login...');
            
            // Redirect to login after 2 seconds
            setTimeout(() => {
                navigate('/');
            }, 2000);
        } catch (err) {
            console.error('Password update error:', err);
            setError(err instanceof Error ? err.message : 'Something went wrong.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <style>{`
                input[type="password"]::-webkit-credentials-auto-fill-button,
                input[type="password"]::-webkit-strong-password-toggle-button {
                    display: none !important;
                    visibility: hidden !important;
                    opacity: 0 !important;
                    pointer-events: none !important;
                    position: absolute;
                    right: -9999px;
                }
            `}</style>
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

                    <div className="text-gray-600 mb-6 text-sm font-medium" style={{ fontFamily: "'Jost', sans-serif" }}>Update Your Password</div>

                    <form onSubmit={handleSubmit} className="w-full space-y-4">
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
                            <label className="block text-gray-700 mb-2 font-semibold text-sm" style={{ fontFamily: "'Jost', sans-serif" }}>New Password</label>
                            <div className="relative group">
                                <Icon icon="mdi:lock-outline" className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-gray-700 transition-colors" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    disabled={loading}
                                    className="w-full pl-12 pr-12 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-gray-400 bg-gray-50/50 shadow-sm hover:shadow-md transition-all duration-200 placeholder-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                                    style={{ fontFamily: "'Jost', sans-serif" }}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    autoFocus
                                    placeholder="Enter new password"
                                    required
                                />
                                <button
                                    type="button"
                                    disabled={loading}
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

                        <div className="space-y-2">
                            <label className="block text-gray-700 mb-2 font-semibold text-sm" style={{ fontFamily: "'Jost', sans-serif" }}>Confirm Password</label>
                            <div className="relative group">
                                <Icon icon="mdi:lock-check-outline" className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-gray-700 transition-colors" />
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    disabled={loading}
                                    className="w-full pl-12 pr-12 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-gray-400 bg-gray-50/50 shadow-sm hover:shadow-md transition-all duration-200 placeholder-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                                    style={{ fontFamily: "'Jost', sans-serif" }}
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                    placeholder="Confirm new password"
                                    required
                                />
                                <button
                                    type="button"
                                    disabled={loading}
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Icon 
                                        icon={showConfirmPassword ? "mdi:eye-off-outline" : "mdi:eye-outline"} 
                                        className="w-5 h-5" 
                                    />
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gray-800 text-white py-3 rounded-xl font-semibold hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:translate-y-0 mt-4 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                            style={{ fontFamily: "'Jost', sans-serif" }}
                        >
                            {loading ? (
                                <>
                                    <Icon icon="mdi:loading" className="inline mr-2 text-lg animate-spin" />
                                    Updating...
                                </>
                            ) : (
                                <>
                                    <Icon icon="mdi:lock-reset" className="inline mr-2 text-lg" />
                                    Update Password
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 pt-4 border-t border-gray-200">
                        <div className="text-xs text-gray-500 text-center">
                            <div className="flex items-center justify-center space-x-2 mb-2">
                                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                                <span className="font-medium" style={{ fontFamily: "'Jost', sans-serif" }}>Secure Password Reset</span>
                                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                            </div>
                            <div style={{ fontFamily: "'Jost', sans-serif" }}>© {new Date().getFullYear()} IZAJ Lighting Centre. All rights reserved.</div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default UpdatePassword;