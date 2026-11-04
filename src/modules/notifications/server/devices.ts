import 'server-only';
import type { ServerSupabase } from '@/lib/supabase/server';
import { asRpcResult } from '@/lib/rpc';

/** Alta de este dispositivo para push (con el JWT del usuario). El dispositivo pasa a la cuenta actual. */
export async function registerPushDevice(supabase: ServerSupabase, sub: { endpoint: string; p256dh: string; auth: string }, userAgent: string | null) {
  return asRpcResult('register_push_device', await supabase.rpc('register_push_device', { p_endpoint: sub.endpoint, p_p256dh: sub.p256dh, p_auth: sub.auth, p_user_agent: userAgent ?? undefined }));
}

export async function unregisterPushDevice(supabase: ServerSupabase, endpoint: string) {
  return asRpcResult('unregister_push_device', await supabase.rpc('unregister_push_device', { p_endpoint: endpoint }));
}
