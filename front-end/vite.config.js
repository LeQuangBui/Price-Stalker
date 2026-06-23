import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      tailwindcss(),
      // E4 Web Push: injectManifest = we author the SW (src/sw.js) for push +
      // notificationclick; the plugin precaches the app shell + injects the
      // registration script (injectRegister:'auto', so app code never imports
      // a PWA virtual module — keeps vitest decoupled from the plugin).
      VitePWA({
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'sw.js',
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        includeAssets: ['icon.svg'],
        manifest: {
          name: 'Price Stalker',
          short_name: 'Price Stalker',
          description: 'Track product prices and get notified the moment they drop.',
          theme_color: '#6d28d9',
          background_color: '#ffffff',
          display: 'standalone',
          start_url: '/',
          icons: [
            { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }
          ]
        },
        injectManifest: {
          globPatterns: ['**/*.{js,css,html,svg,woff,woff2}']
        },
        devOptions: {
          enabled: true,
          type: 'module'
        }
      })
    ],
    server: {
      port: parseInt(env.VITE_PORT),
      host: true,
    },
    test: {
      environment: 'jsdom',
      setupFiles: './src/test/setup.js'
    }
  }
})
