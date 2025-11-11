import React, { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import { useNavigate } from 'react-router-dom';
import API_URL from '../../config/api';

const AcceptInvite: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        const activateInvite = async () => {
            // Extract tokens from URL hash or query parameters
            const urlParams = new URLSearchParams(window.location.search);
            const hash = window.location.hash;
            
            // Log for debugging
            console.log('🔍 [Accept Invite] Current URL:', window.location.href);
            console.log('🔍 [Accept Invite] URL hash:', hash);
            console.log('🔍 [Accept Invite] URL search:', window.location.search);
            
            // Try to get tokens from URL hash (Supabase format)
            // Supabase puts tokens in hash, but sometimes also in query params
            const hashParams = new URLSearchParams(hash.substring(1));
            const accessToken = hashParams.get('access_token') || urlParams.get('access_token');
            const refreshToken = hashParams.get('refresh_token') || urlParams.get('refresh_token');
            const type = hashParams.get('type') || urlParams.get('type');
            
            console.log('🔍 [Accept Invite] Access token found:', !!accessToken);
            console.log('🔍 [Accept Invite] Refresh token found:', !!refreshToken);
            console.log('🔍 [Accept Invite] Type:', type);
            
            // Validate token format (access token should be a JWT)
            if (accessToken && !accessToken.includes('.')) {
                console.warn('⚠️ [Accept Invite] Access token format looks invalid');
            }
            
            if (!accessToken || !refreshToken) {
                console.error('❌ [Accept Invite] Missing tokens in URL');
                setError('Invalid or missing invite link. Please request a new invitation.');
                return;
            }

            setLoading(true);
            setError('');
            setSuccess('');

            try {
                // Call backend to activate user account
                const response = await fetch(`${API_URL}/api/admin/activate-invite`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        access_token: accessToken,
                        refresh_token: refreshToken
                    })
                });

                const data = await response.json();

                if (!response.ok) {
                    // Log the full error for debugging
                    console.error('❌ [Accept Invite] API Error:', {
                        status: response.status,
                        statusText: response.statusText,
                        data: data
                    });
                    throw new Error(data.error || `Failed to activate account (${response.status})`);
                }

                if (!data.success) {
                    throw new Error(data.error || 'Failed to activate account');
                }

                // Mark invite as processed to prevent redirect loop
                const inviteToken = `${accessToken}_${refreshToken}`;
                localStorage.setItem('invite_processed', inviteToken);
                localStorage.removeItem('invite_processing');

                setSuccess('Account activated successfully! Redirecting to login...');

                // Check if we're in a browser (not Tauri app)
                const isTauri = typeof window !== 'undefined' && (window as any).__TAURI__ !== undefined;
                
                if (!isTauri && accessToken && refreshToken) {
                    // Immediately redirect to deep link to open in desktop app
                    const deepLink = `izaj://login#access_token=${encodeURIComponent(accessToken)}&refresh_token=${encodeURIComponent(refreshToken)}${type ? `&type=${encodeURIComponent(type)}` : ''}`;
                    
                    // Wait a bit to show success message, then redirect to deep link
                    setTimeout(() => {
                        // Try to redirect to deep link
                        // This will open the desktop app if installed
                        window.location.href = deepLink;
                    }, 1500);
                } else {
                    // In Tauri app or no tokens, redirect to login page without tokens
                    setTimeout(() => {
                        // Clear URL completely and redirect to clean login page
                        window.location.href = '/';
                    }, 2000);
                }
            } catch (err) {
                console.error('Error activating invite:', err);
                setError(err instanceof Error ? err.message : 'Something went wrong. Please contact administrator.');
            } finally {
                setLoading(false);
            }
        };

        activateInvite();
    }, [navigate]);

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

                {loading && (
                    <div className="text-gray-600 mb-6 text-sm font-medium text-center" style={{ fontFamily: "'Jost', sans-serif" }}>
                        <Icon icon="mdi:loading" className="inline mr-2 text-lg animate-spin" />
                        Activating account...
                    </div>
                )}

                {success && (
                    <div className="mb-6 text-green-600 text-sm text-center bg-green-50 rounded-xl py-3 px-4 border border-green-200 shadow-sm" style={{ fontFamily: "'Jost', sans-serif" }}>
                        <Icon icon="mdi:check-circle-outline" className="inline mr-2 text-green-500" />
                        {success}
                    </div>
                )}

                {error && (
                    <div className="mb-6 text-red-600 text-sm text-center bg-red-50 rounded-xl py-3 px-4 border border-red-200 shadow-sm" style={{ fontFamily: "'Jost', sans-serif" }}>
                        <Icon icon="mdi:alert-circle-outline" className="inline mr-2 text-red-500" />
                        {error}
                    </div>
                )}

                {!loading && !success && !error && (
                    <div className="text-gray-600 mb-6 text-sm font-medium text-center" style={{ fontFamily: "'Jost', sans-serif" }}>
                        Processing invitation...
                    </div>
                )}

                <div className="mt-6 pt-4 border-t border-gray-200">
                    <div className="text-xs text-gray-500 text-center">
                        <div className="flex items-center justify-center space-x-2 mb-2">
                            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                            <span className="font-medium" style={{ fontFamily: "'Jost', sans-serif" }}>Accepting Invitation</span>
                            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                        </div>
                        <div style={{ fontFamily: "'Jost', sans-serif" }}>© {new Date().getFullYear()} IZAJ Lighting Centre. All rights reserved.</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AcceptInvite;

