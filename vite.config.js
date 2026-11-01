import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  server: {
    headers: {
      'Cache-Control': 'public, max-age=86400', // Enable disk caching for browser
    },
  },
  preview: {
    headers: {
      'Cache-Control': 'public, max-age=86400',
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Disable service worker in dev so Chrome DevTools serves from (disk cache) / (memory cache)
      devOptions: {
        enabled: false,
      },
      manifest: {
        name: 'Bore & Barrel',
        short_name: 'Bore & Barrel',
        description: 'A small armory — pistols, rifles, and shotguns.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#f2f4f5',
        theme_color: '#f2f4f5',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              url.pathname.includes('/rest/v1/') ||
              url.pathname.includes('/api/v1/') ||
              url.hostname.includes('supabase.co'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-query-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
})
