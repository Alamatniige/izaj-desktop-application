 import './App.css'; 

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, useNavigate } from 'react-router-dom';
import App from './App.tsx';
import { NotificationsProvider } from './utils/notificationsProvider.tsx';
import { DarkModeProvider } from './utils/darkModeProvider.tsx';
import { SessionProvider } from './utils/sessionContext.tsx';
import { onOpenUrl } from '@tauri-apps/plugin-deep-link';

function parseDeepLink(url: string) {
  try {
    console.log('[DeepLink] ========== PARSING DEEP LINK ==========');
    console.log('[DeepLink] Raw URL:', url);
    
    // First, try manual parsing for izaj:// protocol (most reliable for custom protocols)
    const izajMatch = url.match(/^izaj:\/\/([^#?]+)(?:#(.+))?/);
    if (izajMatch) {
      const route = izajMatch[1].replace(/^\/+/, '').replace(/\/+$/, ''); // Remove leading/trailing slashes
      const fragment = izajMatch[2] || '';
      
      console.log('[DeepLink] Manual parse successful:');
      console.log('[DeepLink]   - Route:', route);
      console.log('[DeepLink]   - Fragment length:', fragment.length);
      console.log('[DeepLink]   - Fragment preview:', fragment ? fragment.substring(0, 100) + '...' : 'empty');
      
      // Parse parameters from hash fragment
      const params = new URLSearchParams(fragment);
      const accessToken = params.get('access_token') ?? undefined;
      const refreshToken = params.get('refresh_token') ?? undefined;
      
      console.log('[DeepLink] Extracted tokens:');
      console.log('[DeepLink]   - Access token:', accessToken ? `present (${accessToken.length} chars)` : 'missing');
      console.log('[DeepLink]   - Refresh token:', refreshToken ? `present (${refreshToken.length} chars)` : 'missing');
      
      const result = {
        route,
        accessToken,
        refreshToken,
        raw: url,
      };
      
      console.log('[DeepLink] Final parse result:', {
        route: result.route,
        hasRoute: !!result.route,
        hasAccessToken: !!result.accessToken,
        hasRefreshToken: !!result.refreshToken,
        hasAllTokens: !!(result.accessToken && result.refreshToken)
      });
      console.log('[DeepLink] ========================================');
      
      return result;
    }
    
    // Fallback: Try URL constructor
    console.log('[DeepLink] Manual parse failed, trying URL constructor...');
    try {
      const u = new URL(url);
      console.log('[DeepLink] URL constructor result:');
      console.log('[DeepLink]   - Protocol:', u.protocol);
      console.log('[DeepLink]   - Host:', u.host);
      console.log('[DeepLink]   - Hostname:', u.hostname);
      console.log('[DeepLink]   - Pathname:', u.pathname);
      console.log('[DeepLink]   - Hash:', u.hash ? u.hash.substring(0, 100) + '...' : 'empty');
      
      let route = u.pathname.replace(/^\/+/, '').replace(/\/+$/, '');
      
      if (!route && u.host) {
        route = u.host;
      }
      
      if (!route && u.hostname) {
        route = u.hostname;
      }
      
      const fragment = u.hash.startsWith('#') ? u.hash.slice(1) : u.hash;
      
      console.log('[DeepLink] Extracted from URL object:');
      console.log('[DeepLink]   - Route:', route);
      console.log('[DeepLink]   - Fragment length:', fragment.length);
      
      const params = new URLSearchParams(fragment);
      const accessToken = params.get('access_token') ?? undefined;
      const refreshToken = params.get('refresh_token') ?? undefined;
      
      const result = {
        route,
        accessToken,
        refreshToken,
        raw: url,
      };
      
      console.log('[DeepLink] Final parse result:', {
        route: result.route,
        hasRoute: !!result.route,
        hasAccessToken: !!result.accessToken,
        hasRefreshToken: !!result.refreshToken,
        hasAllTokens: !!(result.accessToken && result.refreshToken)
      });
      console.log('[DeepLink] ========================================');
      
      return result;
    } catch (urlError) {
      console.error('[DeepLink] URL constructor also failed:', urlError);
      throw new Error('Unable to parse URL with manual parsing or URL constructor');
    }
  } catch (error) {
    console.error('[DeepLink] ========== PARSE ERROR ==========');
    console.error('[DeepLink] Error:', error);
    console.error('[DeepLink] Failed URL:', url);
    console.error('[DeepLink] ==================================');
    return undefined;
  }
}

// Capture early deep link before React mounts (best-effort)
let __pendingDeepLinkUrl: string | null = null;
try {
  console.log('[DeepLink] Setting up early deep link capture...');
  onOpenUrl((payload: string | { url: string }) => {
    const url = typeof payload === 'string' ? payload : payload?.url ?? '';
    console.log('[DeepLink] Early capture - deep link received before React mount:', url);
    __pendingDeepLinkUrl = url;
  });
  console.log('[DeepLink] Early deep link capture set up successfully');
} catch (error) {
  console.warn('[DeepLink] Early deep link capture failed (plugin may not be ready yet):', error);
  // ignore if plugin not ready yet
}

export function DeepLinkHandler() {
  const navigate = useNavigate();

  React.useEffect(() => {
    console.log('[DeepLinkHandler] Component mounted, setting up listeners...');
    
    // Cold start: consume any pending URL captured before mount
    if (__pendingDeepLinkUrl) {
      console.log('[DeepLinkHandler] Processing pending deep link (cold start):', __pendingDeepLinkUrl);
      const parsed = parseDeepLink(__pendingDeepLinkUrl);
      __pendingDeepLinkUrl = null;
      
      if (parsed && parsed.route) {
        console.log('[DeepLinkHandler] Pending deep link parsed successfully, route:', parsed.route);
        console.log('[DeepLinkHandler] Route type:', typeof parsed.route);
        console.log('[DeepLinkHandler] Route length:', parsed.route.length);
        console.log('[DeepLinkHandler] Route starts with "update-password"?', parsed.route.startsWith('update-password'));
        console.log('[DeepLinkHandler] Route === "update-password"?', parsed.route === 'update-password');
        console.log('[DeepLinkHandler] Route includes "update-password"?', parsed.route.includes('update-password'));
        
        if (parsed.route.startsWith('update-password') || parsed.route === 'update-password' || parsed.route.includes('update-password')) {
          console.log('[DeepLinkHandler] ✓ Route matches update-password');
          const search = new URLSearchParams();
          if (parsed.accessToken) {
            search.set('access_token', parsed.accessToken);
            console.log('[DeepLinkHandler] ✓ Access token added to query');
          } else {
            console.warn('[DeepLinkHandler] ⚠ No access token found!');
          }
          if (parsed.refreshToken) {
            search.set('refresh_token', parsed.refreshToken);
            console.log('[DeepLinkHandler] ✓ Refresh token added to query');
          } else {
            console.warn('[DeepLinkHandler] ⚠ No refresh token found!');
          }
          const targetUrl = `/update-password?${search.toString()}`;
          console.log('[DeepLinkHandler] ========== NAVIGATING ==========');
          console.log('[DeepLinkHandler] Target URL:', targetUrl);
          console.log('[DeepLinkHandler] Current location before nav:', window.location.pathname + window.location.search);
          // Use replace: true to prevent back navigation and ensure it happens immediately
          navigate(targetUrl, { replace: true });
          console.log('[DeepLinkHandler] Navigate() called - checking location after...');
          // Check location after a brief delay
          setTimeout(() => {
            console.log('[DeepLinkHandler] Location after navigation:', window.location.pathname + window.location.search);
            console.log('[DeepLinkHandler] ====================================');
          }, 100);
          console.log('[DeepLinkHandler] Navigation completed (cold start)');
          return; // Exit early to prevent setting up listener if we're already handling a deep link
        } else if (parsed.route === 'login') {
          const search = new URLSearchParams();
          if (parsed.accessToken) search.set('access_token', parsed.accessToken);
          if (parsed.refreshToken) search.set('refresh_token', parsed.refreshToken);
          const targetUrl = `/?${search.toString()}`;
          console.log('[DeepLinkHandler] Navigating to login:', targetUrl);
          // Navigate to login page with tokens (for invite acceptance)
          navigate(targetUrl, { replace: true });
          console.log('[DeepLinkHandler] Navigation completed (cold start)');
          return;
        }
      } else {
        console.warn('[DeepLinkHandler] Failed to parse pending deep link or no route found');
      }
    } else {
      console.log('[DeepLinkHandler] No pending deep link found');
    }

    console.log('[DeepLinkHandler] Setting up onOpenUrl listener...');
    const unlistenPromise = onOpenUrl((payload: string | { url: string }) => {
      const url = typeof payload === 'string' ? payload : payload?.url ?? '';
      console.log('[DeepLinkHandler] Deep link received:', url);
      
      const parsed = parseDeepLink(url);
      if (!parsed) {
        console.warn('[DeepLinkHandler] Failed to parse deep link URL');
        return;
      }
      
      if (parsed.route) {
        console.log('[DeepLinkHandler] Processing route:', parsed.route);
        console.log('[DeepLinkHandler] Route type:', typeof parsed.route);
        console.log('[DeepLinkHandler] Route length:', parsed.route.length);
        console.log('[DeepLinkHandler] Route starts with "update-password"?', parsed.route.startsWith('update-password'));
        console.log('[DeepLinkHandler] Route === "update-password"?', parsed.route === 'update-password');
        console.log('[DeepLinkHandler] Route includes "update-password"?', parsed.route.includes('update-password'));
        
        if (parsed.route.startsWith('update-password') || parsed.route === 'update-password' || parsed.route.includes('update-password')) {
          console.log('[DeepLinkHandler] ✓ Route matches update-password');
          const search = new URLSearchParams();
          if (parsed.accessToken) {
            search.set('access_token', parsed.accessToken);
            console.log('[DeepLinkHandler] ✓ Access token added to query');
          } else {
            console.warn('[DeepLinkHandler] ⚠ No access token found!');
          }
          if (parsed.refreshToken) {
            search.set('refresh_token', parsed.refreshToken);
            console.log('[DeepLinkHandler] ✓ Refresh token added to query');
          } else {
            console.warn('[DeepLinkHandler] ⚠ No refresh token found!');
          }
          const targetUrl = `/update-password?${search.toString()}`;
          console.log('[DeepLinkHandler] ========== NAVIGATING ==========');
          console.log('[DeepLinkHandler] Target URL:', targetUrl);
          console.log('[DeepLinkHandler] Current location before nav:', window.location.pathname + window.location.search);
          // Immediately navigate to update-password page
          navigate(targetUrl, { replace: true });
          console.log('[DeepLinkHandler] Navigate() called - checking location after...');
          // Check location after a brief delay
          setTimeout(() => {
            console.log('[DeepLinkHandler] Location after navigation:', window.location.pathname + window.location.search);
            console.log('[DeepLinkHandler] ====================================');
          }, 100);
          console.log('[DeepLinkHandler] Navigation to update-password completed');
        } else if (parsed.route === 'login') {
          const search = new URLSearchParams();
          if (parsed.accessToken) search.set('access_token', parsed.accessToken);
          if (parsed.refreshToken) search.set('refresh_token', parsed.refreshToken);
          const targetUrl = `/?${search.toString()}`;
          console.log('[DeepLinkHandler] Navigating to login:', targetUrl);
          // Navigate to login page with tokens (for invite acceptance)
          navigate(targetUrl, { replace: true });
          console.log('[DeepLinkHandler] Navigation to login completed');
        } else {
          console.warn('[DeepLinkHandler] Unknown route:', parsed.route);
        }
      } else {
        console.warn('[DeepLinkHandler] No route found in parsed deep link');
      }
    });

    console.log('[DeepLinkHandler] Deep link listener set up successfully');

    return () => {
      console.log('[DeepLinkHandler] Cleaning up deep link listener...');
      unlistenPromise.then((unlisten: () => void) => {
        unlisten();
        console.log('[DeepLinkHandler] Deep link listener cleaned up');
      }).catch((err) => {
        console.error('[DeepLinkHandler] Error cleaning up listener:', err);
      });
    };
  }, [navigate]);

  return null;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <DarkModeProvider>
      <SessionProvider>
        <NotificationsProvider>
          <DeepLinkHandler />
          <App />
        </NotificationsProvider>
      </SessionProvider>
    </DarkModeProvider>
  </BrowserRouter>
);