 import './App.css'; 

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, useNavigate } from 'react-router-dom';
import App from './App.tsx';
import { NotificationsProvider } from './utils/notificationsProvider.tsx';
import { onOpenUrl } from '@tauri-apps/plugin-deep-link';

function parseDeepLink(url: string) {
  try {
    const u = new URL(url);
    const route = `${u.host}${u.pathname}`.replace(/^\/+/, ''); // e.g., 'update-password'
    const fragment = u.hash.startsWith('#') ? u.hash.slice(1) : u.hash; // access_token=...&refresh_token=...
    const params = new URLSearchParams(fragment);
    return {
      route,
      accessToken: params.get('access_token') ?? undefined,
      refreshToken: params.get('refresh_token') ?? undefined,
      raw: url,
    };
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
      if (parsed && parsed.route && parsed.route.startsWith('update-password')) {
        const search = new URLSearchParams();
        if (parsed.accessToken) search.set('access_token', parsed.accessToken);
        if (parsed.refreshToken) search.set('refresh_token', parsed.refreshToken);
        navigate(`/update-password?${search.toString()}`, { replace: true });
      }
    }

    const unlistenPromise = onOpenUrl((payload: string | { url: string }) => {
      const url = typeof payload === 'string' ? payload : payload?.url ?? '';
      const parsed = parseDeepLink(url);
      if (!parsed) return;
      if (parsed.route && parsed.route.startsWith('update-password')) {
        const search = new URLSearchParams();
        if (parsed.accessToken) search.set('access_token', parsed.accessToken);
        if (parsed.refreshToken) search.set('refresh_token', parsed.refreshToken);
        navigate(`/update-password?${search.toString()}`, { replace: true });
      }
    });

    return () => {
      unlistenPromise.then((unlisten: () => void) => unlisten());
    };
  }, [navigate]);

  return null;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <NotificationsProvider>
      <DeepLinkHandler />
      <App />
    </NotificationsProvider>
  </BrowserRouter>
);