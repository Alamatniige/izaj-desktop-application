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
    const navigate = useNavigate();

    useEffect(() => {
        // Extract tokens from URL hash or query parameters
        const urlParams = new URLSearchParams(window.location.search);
        const hash = window.location.hash;
        
        // Try to get tokens from URL hash (Supabase format)
        const hashParams = new URLSearchParams(hash.substring(1));
        const accessToken = hashParams.get('access_token') || urlParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token') || urlParams.get('refresh_token');
        
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
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-yellow-50 via-white to-yellow-100">
            <div className="bg-white rounded-3xl shadow-2xl border border-yellow-100 px-10 py-12 w-full max-w-md flex flex-col items-center relative">
                {/* Logo */}
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-yellow-100 rounded-full p-3 shadow-lg">
                    <img
                        src="/izaj.jpg"
                        alt="IZAJ Logo"
                        className="w-16 h-16 rounded-full bg-yellow-400 border-4 border-yellow-200 shadow"
                    />
                </div>

                <div className="mt-12 mb-2 flex flex-col items-center">
                    <h2
                        className="text-4xl font-bold text-gray-800 mb-1"
                        style={{
                            color: '#000000',
                            fontFamily: "'Playfair Display', serif",
                            textShadow: '-2px 0px 2px rgba(0, 0, 0, 0.5)',
                            letterSpacing: '10px',
                        }}
                    >
                        IZAJ
                    </h2>
                    <span className="text-yellow-500 font-semibold tracking-widest text-xs mb-2">ADMIN PANEL</span>
                </div>

                <div className="text-gray-500 mb-6 text-sm">Update Your Password</div>

                <form onSubmit={handleSubmit} className="w-full space-y-5">
                    {error && (
                        <div className="mb-2 text-red-500 text-sm text-center bg-red-50 rounded-lg py-2 px-3 border border-red-100">
                            <Icon icon="mdi:alert-circle-outline" className="inline mr-1" />
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="mb-2 text-green-500 text-sm text-center bg-green-50 rounded-lg py-2 px-3 border border-green-100">
                            <Icon icon="mdi:check-circle-outline" className="inline mr-1" />
                            {success}
                        </div>
                    )}

                    <div>
                        <label className="block text-gray-700 mb-2 font-medium">New Password</label>
                        <div className="relative">
                            <Icon icon="mdi:lock-outline" className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-yellow-400" />
                            <input
                                type="password"
                                className="w-full pl-10 pr-4 py-2 border border-yellow-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-200 bg-yellow-50 shadow"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                autoFocus
                                placeholder="Enter new password"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-gray-700 mb-2 font-medium">Confirm Password</label>
                        <div className="relative">
                            <Icon icon="mdi:lock-check-outline" className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-yellow-400" />
                            <input
                                type="password"
                                className="w-full pl-10 pr-4 py-2 border border-yellow-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-200 bg-yellow-50 shadow"
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                placeholder="Confirm new password"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className={`w-full bg-yellow-400 text-gray-900 py-2 rounded-xl font-semibold hover:bg-yellow-500 transition shadow-lg mt-2 flex items-center justify-center ${loading ? 'opacity-60 cursor-not-allowed' : ''}`}
                        disabled={loading}
                    >
                        {loading ? (
                            <Icon icon="mdi:loading" className="inline mr-2 animate-spin" />
                        ) : (
                            <Icon icon="mdi:lock-reset" className="inline mr-2" />
                        )}
                        {loading ? 'Updating...' : 'Update Password'}
                    </button>
                </form>

                <div className="mt-6 text-xs text-gray-400 text-center">
                    © {new Date().getFullYear()} IZAJ. All rights reserved.
                </div>
            </div>
        </div>
    );
};

export default UpdatePassword;