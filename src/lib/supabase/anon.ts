import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { publicEnv } from '@/config/env';
import type { Database } from '@/types/database';

/**
 * Cliente anónimo sin cookies: para respuestas públicas cacheables en CDN (ARCHITECTURE.md §12.1).
 * Ejecuta como `anon` aunque haya sesión, así una respuesta cacheada nunca contiene datos de un usuario.
 */
export function createAnonClient() {
  return createClient<Database>(publicEnv.NEXT_PUBLIC_SUPABASE_URL, publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
