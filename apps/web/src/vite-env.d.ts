/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

// The deploy's build id, injected by Vite `define` (see vite.config.ts).
declare const __BUILD_ID__: string;

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_VAPID_PUBLIC_KEY: string;
  readonly VITE_PUSH_WORKER_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
