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
    console.log('[DeepLink] Parsing URL:', url);
    
    let u: URL;
    let route = '';
    let fragment = '';
    
    try {
      u = new URL(url);
      
      route = u.pathname.replace(/^\/+/, '');
      
      if (!route && u.host) {
        route = u.host;
      }
      
      fragment = u.hash.startsWith('#') ? u.hash.slice(1) : u.hash;
    } catch (urlError) {
      console.log('[DeepLink] URL constructor failed, trying manual parsing:', urlError);
      
      const izajMatch = url.match(/^izaj:\/\/([^#?]+)(?:#(.+))?/);
      if (izajMatch) {
        route = izajMatch[1].replace(/^\/+/, '');
        fragment = izajMatch[2] || '';
        console.log('[DeepLink] Manual parse - route:', route, 'fragment:', fragment ? fragment.substring(0, 50) + '...' : 'empty');
      } else {
        throw new Error('Unable to parse URL with URL constructor or manual parsing');
      }
    }
    
    if (!route) {
      const pathMatch = url.match(/izaj:\/\/([^#?]+)/);
      if (pathMatch) {
        route = pathMatch[1].replace(/^\/+/, '');
      }
    }
    
    const params = new URLSearchParams(fragment);
    const accessToken = params.get('access_token') ?? undefined;
    const refreshToken = params.get('refresh_token') ?? undefined;
    
    console.log('[DeepLink] Parsed tokens:', {
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
      accessTokenLength: accessToken?.length || 0,
      refreshTokenLength: refreshToken?.length || 0,
    });
    
    const result = {
      route,
      accessToken,
      refreshToken,
      raw: url,
    };
    
    console.log('[DeepLink] Parse result:', { route: result.route, hasTokens: !!(result.accessToken && result.refreshToken) });
    
    return result;
  } catch (error) {
    console.error('[DeepLink] Error parsing URL:', error);
    console.error('[DeepLink] Failed URL:', url);
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
        
        if (parsed.route.startsWith('update-password')) {
          const search = new URLSearchParams();
          if (parsed.accessToken) search.set('access_token', parsed.accessToken);
          if (parsed.refreshToken) search.set('refresh_token', parsed.refreshToken);
          const targetUrl = `/update-password?${search.toString()}`;
          console.log('[DeepLinkHandler] Navigating to:', targetUrl);
          // Use replace: true to prevent back navigation and ensure it happens immediately
          navigate(targetUrl, { replace: true });
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
        
        if (parsed.route.startsWith('update-password')) {
          const search = new URLSearchParams();
          if (parsed.accessToken) search.set('access_token', parsed.accessToken);
          if (parsed.refreshToken) search.set('refresh_token', parsed.refreshToken);
          const targetUrl = `/update-password?${search.toString()}`;
          console.log('[DeepLinkHandler] Navigating to update-password:', targetUrl);
          // Immediately navigate to update-password page
          navigate(targetUrl, { replace: true });
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