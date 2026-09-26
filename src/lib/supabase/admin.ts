import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { publicEnv } from '@/config/env';
import { serverEnv } from '@/config/server-env';
import type { Database } from '@/types/database';

/**
 * Cliente con service_role. SOLO para el worker de la cola y el cron (ADR-018, ARCHITECTURE.md §10.3).
 * Nunca en un request iniciado por un usuario: salta RLS.
 */
export function createServiceClient() {
  return createClient<Database>(publicEnv.NEXT_PUBLIC_SUPABASE_URL, serverEnv().SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
