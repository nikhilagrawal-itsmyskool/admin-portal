import React, { useEffect, useRef, useState } from 'react';

// Cloudflare Turnstile (free CAPTCHA). Loads the widget script once and renders an
// explicit widget; calls onToken(token) when solved and onToken('') when the token
// expires or errors. Renders nothing (and never loads the script) when no sitekey is
// configured, so a build without VITE_TURNSTILE_SITEKEY behaves exactly as before.
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

// Turnstile's "normal" widget is a fixed 300x65 box — it has no fluid-width mode. Left
// alone it looks narrower than our full-width inputs on desktop and can overflow them on
// a narrow PWA. We measure the available width and scale the fixed box to match.
const NATIVE_W = 300;
const NATIVE_H = 65;

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
  const outerRef = useRef(null);
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const [scale, setScale] = useState(1);

  // Track the available width and scale the fixed 300px box to fill it, so the widget
  // lines up with the full-width fields on both desktop and narrow PWA.
  useEffect(() => {
    if (!sitekey) return undefined;
    const el = outerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const measure = () => {
      const w = el.clientWidth;
      if (w > 0) setScale(w / NATIVE_W);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [sitekey]);

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
    <div ref={outerRef} style={{ marginTop: 16, width: '100%' }}>
      {/* Reserve the scaled height so the transform doesn't leave a gap / overflow. */}
      <div style={{ height: NATIVE_H * scale, display: 'flex', justifyContent: 'center' }}>
        <div
          ref={containerRef}
          style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }}
        />
      </div>
    </div>
  );
}
