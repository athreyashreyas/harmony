import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { fetchWithTimeout, REQUEST_TIMEOUT_MS } from '../timeout';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

// Auth and the profiles table are the only things Phase 2 touches. Broader
// sync (areas, habits, logs) is a later phase and lives in sync.ts then.
//
// Every request gets a ceiling. Without one, a server that answers the
// connection but not the request leaves each call open forever, which is how an
// outage turned into an app that never finished booting.
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url, anonKey, {
      global: { fetch: fetchWithTimeout(REQUEST_TIMEOUT_MS) },
    })
  : null;
