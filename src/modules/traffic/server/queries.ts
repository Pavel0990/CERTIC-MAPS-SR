import 'server-only';
import type { ServerSupabase } from '@/lib/supabase/server';

/** Alertas de tránsito vigentes en el mapa público (para el aviso de la portada). */
export async function countActiveAlerts(supabase: ServerSupabase) {
  const { count } = await supabase
    .from('traffic_reports')
    .select('id', { count: 'exact', head: true })
    .in('status', ['active', 'verified'])
    .gt('expires_at', new Date().toISOString());
  return count ?? 0;
}
