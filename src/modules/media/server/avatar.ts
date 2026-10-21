import 'server-only';
import type { ServerSupabase } from '@/lib/supabase/server';
import { asRpcResult } from '@/lib/rpc';

/** Registra la foto recién subida (true) o su borrado (false). La RPC comprueba que el archivo exista y limita a 10 cambios por hora. */
export async function setAvatar(supabase: ServerSupabase, present: boolean) {
  return asRpcResult('set_avatar', await supabase.rpc('set_avatar', { p_present: present }));
}
