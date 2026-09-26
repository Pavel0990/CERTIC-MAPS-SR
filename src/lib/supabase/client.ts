'use client';
import { createBrowserClient } from '@supabase/ssr';
import { publicEnv } from '@/config/env';
import type { Database } from '@/types/database';

let client: ReturnType<typeof createBrowserClient<Database>> | null = null;

/** Cliente de navegador (singleton): sesión del usuario y canal de tiempo real. */
export function getBrowserClient() {
  client ??= createBrowserClient<Database>(publicEnv.NEXT_PUBLIC_SUPABASE_URL, publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  return client;
}
