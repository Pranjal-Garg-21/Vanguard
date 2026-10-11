import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Offline app. Everything a student needs is in the build (scripts, styles, fonts, icons and all
    // content), so after one online visit the whole app opens and plays with no internet.
    // The facilitator pages need the network anyway, so their code is not downloaded by students.
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'icons/*.png'],
      manifest: {
        name: 'PaisaPath',
        short_name: 'PaisaPath',
        description: 'Practise money skills and spot scams on a simulated phone. Works without internet.',
        lang: 'en',
        start_url: '/',
        scope: '/',
        id: '/',
        theme_color: '#141c2e',
        background_color: '#141c2e',
        display: 'standalone',
        orientation: 'portrait',
        categories: ['education', 'finance'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,webmanifest}'],
        globIgnores: [
          // Facilitator code loads on demand, only for facilitators, and is kept after the first visit.
          '**/FacilitatorApp-*.js',
          // Telugu, Devanagari and Nastaliq together are about 250 KB. A student
          // playing in English never needs them, so they are fetched the first
          // time a language is chosen (src/app/fonts.ts) and kept from then on.
          '**/noto-*.woff2',
          '**/noto-*.woff',
          // The same for the strings themselves: four bundles are about 2.9 MB
          // of JSON, and a student reads in one language.
          '**/lang-*.js',
        ],
        runtimeCaching: [
          {
            urlPattern: ({ url }: { url: URL }) => /\/assets\/FacilitatorApp-.*\.js$/.test(url.pathname),
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'facilitator-code' },
          },
          {
            urlPattern: ({ url }: { url: URL }) => /\/assets\/noto-.*\.woff2?$/.test(url.pathname),
            handler: 'CacheFirst',
            options: { cacheName: 'script-fonts', expiration: { maxEntries: 12 } },
          },
          {
            // A language pack, kept once downloaded so the phone can go offline in it.
            urlPattern: ({ url }: { url: URL }) => /\/assets\/lang-(te|hi|ur)-.*\.js$/.test(url.pathname),
            handler: 'CacheFirst',
            options: { cacheName: 'language-packs', expiration: { maxEntries: 200 } },
          },
          {
            // Spoken text (see src/platform/audio). Downloaded per language,
            // never with the app, and kept once heard so the phone can go offline.
            urlPattern: ({ url }: { url: URL }) => url.pathname.startsWith('/audio/'),
            handler: 'CacheFirst',
            options: { cacheName: 'audio', expiration: { maxEntries: 400 }, rangeRequests: true },
          },
        ],
        // Any page address opens the app, so deep links such as /safe/upi work offline.
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      },
    }),
  ],
  build: {
    rolldownOptions: {
      output: {
        /**
         * A language pack's chunks are named lang-<code>-… so the service
         * worker can leave them out of the install and fetch them when a
         * student picks that language (see workbox below, and platform/i18n).
         * Without this they are named after the string file, and te/bag.json
         * and hi/bag.json are indistinguishable from each other.
         */
        chunkFileNames(chunk: { facadeModuleId?: string | null; name: string }) {
          const pack = /content\/i18n\/(te|hi|ur)\//.exec(chunk.facadeModuleId ?? '');
          return pack ? `assets/lang-${pack[1]}-[name]-[hash].js` : 'assets/[name]-[hash].js';
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@shared': fileURLToPath(new URL('../shared', import.meta.url)),
    },
  },
  server: {
    // Allow importing ../shared during development.
    fs: { allow: ['..'] },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
