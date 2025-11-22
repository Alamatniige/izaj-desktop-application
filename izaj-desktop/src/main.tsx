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
    // First, try manual parsing for izaj:// protocol (most reliable for custom protocols)
    const izajMatch = url.match(/^izaj:\/\/([^#?]+)(?:#(.+))?/);
    if (izajMatch) {
      const route = izajMatch[1].replace(/^\/+/, '').replace(/\/+$/, ''); // Remove leading/trailing slashes
      const fragment = izajMatch[2] || '';
      
      // Parse parameters from hash fragment
      const params = new URLSearchParams(fragment);
      const accessToken = params.get('access_token') ?? undefined;
      const refreshToken = params.get('refresh_token') ?? undefined;
      
      return {
        route,
        accessToken,
        refreshToken,
        raw: url,
      };
    }
    
    // Fallback: Try URL constructor
    try {
      const u = new URL(url);
      
      let route = u.pathname.replace(/^\/+/, '').replace(/\/+$/, '');
      
      if (!route && u.host) {
        route = u.host;
      }
      
      if (!route && u.hostname) {
        route = u.hostname;
      }
      
      const fragment = u.hash.startsWith('#') ? u.hash.slice(1) : u.hash;
      
      const params = new URLSearchParams(fragment);
      const accessToken = params.get('access_token') ?? undefined;
      const refreshToken = params.get('refresh_token') ?? undefined;
      
      return {
        route,
        accessToken,
        refreshToken,
        raw: url,
      };
    } catch {
      throw new Error('Unable to parse URL with manual parsing or URL constructor');
    }
  } catch {
    return undefined;
  }
}

// Capture early deep link before React mounts (best-effort)
let __pendingDeepLinkUrl: string | null = null;
try {
  onOpenUrl((payload: string | { url: string }) => {
    const url = typeof payload === 'string' ? payload : payload?.url ?? '';
    __pendingDeepLinkUrl = url;
  });
} catch {
  // ignore if plugin not ready yet
}

export function DeepLinkHandler() {
  const navigate = useNavigate();

  React.useEffect(() => {
    // Cold start: consume any pending URL captured before mount
    if (__pendingDeepLinkUrl) {
      const parsed = parseDeepLink(__pendingDeepLinkUrl);
      __pendingDeepLinkUrl = null;
      
      if (parsed && parsed.route) {
        if (parsed.route.startsWith('update-password') || parsed.route === 'update-password' || parsed.route.includes('update-password')) {
          const search = new URLSearchParams();
          if (parsed.accessToken) search.set('access_token', parsed.accessToken);
          if (parsed.refreshToken) search.set('refresh_token', parsed.refreshToken);
          const targetUrl = `/update-password?${search.toString()}`;
          navigate(targetUrl, { replace: true });
          return; // Exit early to prevent setting up listener if we're already handling a deep link
        } else if (parsed.route === 'login') {
          const search = new URLSearchParams();
          if (parsed.accessToken) search.set('access_token', parsed.accessToken);
          if (parsed.refreshToken) search.set('refresh_token', parsed.refreshToken);
          const targetUrl = `/?${search.toString()}`;
          navigate(targetUrl, { replace: true });
          return;
        }
      }
    }

    const unlistenPromise = onOpenUrl((payload: string | { url: string }) => {
      const url = typeof payload === 'string' ? payload : payload?.url ?? '';
      const parsed = parseDeepLink(url);
      if (!parsed) return;
      
      if (parsed.route) {
        if (parsed.route.startsWith('update-password') || parsed.route === 'update-password' || parsed.route.includes('update-password')) {
          const search = new URLSearchParams();
          if (parsed.accessToken) search.set('access_token', parsed.accessToken);
          if (parsed.refreshToken) search.set('refresh_token', parsed.refreshToken);
          const targetUrl = `/update-password?${search.toString()}`;
          navigate(targetUrl, { replace: true });
        } else if (parsed.route === 'login') {
          const search = new URLSearchParams();
          if (parsed.accessToken) search.set('access_token', parsed.accessToken);
          if (parsed.refreshToken) search.set('refresh_token', parsed.refreshToken);
          const targetUrl = `/?${search.toString()}`;
          navigate(targetUrl, { replace: true });
        }
      }
    });

    return () => {
      unlistenPromise.then((unlisten: () => void) => unlisten()).catch(() => {});
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