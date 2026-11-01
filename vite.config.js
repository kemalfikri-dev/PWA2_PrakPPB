import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

function diskCacheHeadersPlugin() {
  const setCacheHeader = (req, res, next) => {
    if (req.url && /\.(png|svg|jpg|jpeg|webp|gif|ico|js|css|woff2?)$/i.test(req.url)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
    }
    next()
  }

  return {
    name: 'vite-plugin-disk-cache-headers',
    configureServer(server) {
      server.middlewares.use(setCacheHeader)
    },
    configurePreviewServer(server) {
      server.middlewares.use(setCacheHeader)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  server: {
    headers: {
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  },
  preview: {
    headers: {
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  },
  plugins: [
    react(),
    diskCacheHeadersPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: null, // Do not auto-register SW so browser uses native (disk cache)
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
    }),
  ],
})
