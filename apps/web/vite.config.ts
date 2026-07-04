import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

// A per-deploy build id. On Cloudflare Pages this is the commit SHA; locally it
// falls back to a timestamp. It is baked into the app (as __BUILD_ID__) and also
// written to /version.json, so a running client can cheaply tell whether the
// server is serving a newer build than the one it is running (see appUpdate.ts).
const buildId = process.env.CF_PAGES_COMMIT_SHA || String(Date.now());

// Emit /version.json alongside the build so a running client can probe the
// deployed build id without going through the service worker or HTTP cache.
const versionJsonPlugin: Plugin = {
  name: 'harmony-version-json',
  apply: 'build',
  generateBundle() {
    this.emitFile({
      type: 'asset',
      fileName: 'version.json',
      source: JSON.stringify({ build: buildId }),
    });
  },
};

// injectManifest lets us own sw.ts (custom push and notificationclick handlers,
// section 17.2) while vite-plugin-pwa still precaches the app shell. The
// manifest already lives in public/manifest.webmanifest and is linked from
// index.html, so the plugin does not generate one. Registration is manual via
// the virtual module in pwa.ts, so injectRegister is off here.
export default defineConfig({
  define: {
    __BUILD_ID__: JSON.stringify(buildId),
  },
  plugins: [
    react(),
    versionJsonPlugin,
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      injectRegister: null,
      manifest: false,
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@harmony/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
    },
  },
  server: {
    port: 5173,
  },
});
