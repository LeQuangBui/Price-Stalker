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
      setupFiles: './src/test/setup.js',
      // The suite runs in one fixed zone on every machine. Intl.DateTimeFormat with no `timeZone`
      // renders in the host's, so a chart test that pins the instant but not the zone asserts
      // against "03:43" on a UTC+10 laptop and "17:43" on a UTC runner — different strings, and
      // the browser-measured widths behind them only exist for one of the two. The component is
      // right to render in the reader's own zone; only the tests need to agree on one.
      // Vitest assigns these into the worker's process.env before any test module loads, and Node
      // re-reads TZ on assignment, so this wins over whatever TZ the shell exports.
      // src/test/timezone.guard.test.js holds it to that.
      env: { TZ: 'UTC' }
    }
  }
})
