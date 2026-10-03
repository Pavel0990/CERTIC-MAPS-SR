import 'server-only';
import type { ServerSupabase } from '@/lib/supabase/server';
import type { RpcResult } from '@/lib/http';

/** Alta de este dispositivo para push (con el JWT del usuario). El dispositivo pasa a la cuenta actual. */
export async function registerPushDevice(supabase: ServerSupabase, sub: { endpoint: string; p256dh: string; auth: string }, userAgent: string | null) {
  const { data, error } = await supabase.rpc('register_push_device', { p_endpoint: sub.endpoint, p_p256dh: sub.p256dh, p_auth: sub.auth, p_user_agent: userAgent ?? undefined });
  if (error) throw new Error(`register_push_device: ${error.message}`);
  return data as unknown as RpcResult;
}

export async function unregisterPushDevice(supabase: ServerSupabase, endpoint: string) {
  const { data, error } = await supabase.rpc('unregister_push_device', { p_endpoint: endpoint });
  if (error) throw new Error(`unregister_push_device: ${error.message}`);
  return data as unknown as RpcResult;
}
