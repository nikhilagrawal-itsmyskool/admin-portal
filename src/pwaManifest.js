// Runtime per-school PWA manifest.
//
// We ship ONE build to a wildcard domain (*.itsmyskool.com), so the app name
// can't be baked in at build time — every school would share one string.
// Instead we read the subdomain in the browser and swap in a manifest branded
// for that school (e.g. "DBPASN Staff"). Zero extra builds / infra.
//
// Notes / caveats:
// - Applies to NEW installs. An already-installed PWA keeps its old home-screen
//   label + icon until it is removed and re-added (no data loss — just the shortcut).
// - All URL members are absolute (against location.origin): a blob: manifest URL
//   has no usable base path, so relative start_url/scope/icons would resolve wrong.
// - `id` is pinned to the origin root so the identity equals the pre-existing
//   implicit identity (the old static manifest's start_url), keeping existing
//   installs as the SAME app rather than forking a duplicate.
// - Wrapped in try/catch: if a browser rejects a blob manifest, we silently keep
//   the reliable build-time static manifest (generic "ItsMySkool Staff").

// Optional pretty-name overrides; otherwise the uppercased subdomain code is used.
const SCHOOL_DISPLAY_NAMES = {
  dbpasn: 'DBPASN',
};

function schoolCodeFromHost() {
  const host = window.location.hostname;
  if (host.endsWith('.itsmyskool.com')) {
    const sub = host.split('.')[0];
    if (sub && sub !== 'www' && sub !== 'api') return sub;
  }
  return null;
}

// Human-facing school brand derived from the subdomain (falls back to the product
// name on preview/apex/unknown hosts).
export function getSchoolBrand() {
  const code = schoolCodeFromHost();
  if (!code) return 'ItsMySkool';
  return SCHOOL_DISPLAY_NAMES[code] || code.toUpperCase();
}

export function injectPwaManifest() {
  try {
    const origin = window.location.origin;
    const brand = getSchoolBrand();
    const name = `${brand} Staff`;
    const manifest = {
      id: `${origin}/`,
      name,
      // Keep the home-screen label identical to the install-prompt name.
      short_name: name,
      description: `${brand} staff portal — timetable, attendance, inventory and more.`,
      theme_color: '#3366ff',
      background_color: '#3366ff',
      display: 'standalone',
      start_url: `${origin}/`,
      scope: `${origin}/`,
      icons: [
        { src: `${origin}/pwa-192x192.png`, sizes: '192x192', type: 'image/png' },
        { src: `${origin}/pwa-512x512.png`, sizes: '512x512', type: 'image/png' },
        {
          src: `${origin}/pwa-maskable-512x512.png`,
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable',
        },
      ],
    };
    const blob = new Blob([JSON.stringify(manifest)], {
      type: 'application/manifest+json',
    });
    const href = URL.createObjectURL(blob);
    let link = document.querySelector('link[rel="manifest"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'manifest';
      document.head.appendChild(link);
    }
    link.setAttribute('href', href);
    document.title = `${name} — ItsMySkool`;
  } catch {
    // Non-fatal: keep the build-time static manifest.
  }
}
