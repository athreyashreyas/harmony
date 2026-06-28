import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// PWA tooling (vite-plugin-pwa) is installed but wired up in Phase 10, not here.
export default defineConfig({
  plugins: [react()],
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
