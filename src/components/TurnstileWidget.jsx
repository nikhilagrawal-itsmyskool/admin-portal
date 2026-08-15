import React, { useEffect, useRef } from 'react';

// Cloudflare Turnstile (free CAPTCHA). Loads the widget script once and renders an
// explicit widget; calls onToken(token) when solved and onToken('') when the token
// expires or errors. Renders nothing (and never loads the script) when no sitekey is
// configured, so a build without VITE_TURNSTILE_SITEKEY behaves exactly as before.
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

let scriptPromise = null;
function loadTurnstileScript() {
  if (window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = SCRIPT_SRC;
    s.async = true;
    s.defer = true;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
  return scriptPromise;
}

export default function TurnstileWidget({ sitekey, onToken }) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);

  useEffect(() => {
    if (!sitekey) return undefined;
    let cancelled = false;

    loadTurnstileScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) return;
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey,
          callback: (token) => onToken(token),
          'expired-callback': () => onToken(''),
          'error-callback': () => onToken(''),
        });
      })
      .catch(() => {
        // Script blocked/offline: no token. The backend fails open on Cloudflare
        // being unreachable, so login still works.
      });

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          /* already gone */
        }
        widgetIdRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sitekey]);

  if (!sitekey) return null;
  return (
    <div
      ref={containerRef}
      style={{ marginTop: 16, display: 'flex', justifyContent: 'center' }}
    />
  );
}
