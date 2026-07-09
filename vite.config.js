import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // Auto-update: a new deploy is fetched by the service worker and applied on next
      // launch/navigation — features ship without a reinstall. Registration is injected
      // automatically (injectRegister defaults to 'auto').
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'favicon-32x32.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'ItsMySkool Admin Portal',
        short_name: 'ItsMySkool',
        description: 'ItsMySkool staff portal — timetable, attendance, inventory and more.',
        theme_color: '#3366ff',
        background_color: '#3366ff',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff,woff2}'],
        // SPA: unknown paths fall back to index.html, except the API (different origin
        // anyway, but keep the guard explicit).
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/],
        cleanupOutdatedCaches: true,
        // Main bundle is ~2.1 MB — above Workbox's 2 MB default — so raise the cap to
        // ensure it gets precached (otherwise the app wouldn't work offline).
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
    }),
  ],
  preview: {
    allowedHosts: ['dbpasn.itsmyskool.com'],
  },
});
