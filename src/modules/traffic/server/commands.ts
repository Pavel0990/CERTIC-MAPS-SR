import 'server-only';
import type { ServerSupabase } from '@/lib/supabase/server';
import type { RpcResult } from '@/lib/http';
import type { TrafficReportInput } from '../schemas';

/** Crea un reporte de tránsito con el JWT del usuario. La RPC decide estado, municipio y vencimiento. */
export async function createTrafficReport(supabase: ServerSupabase, input: TrafficReportInput) {
  const { data, error } = await supabase.rpc('create_traffic_report', {
    p_type: input.type,
    p_lat: input.lat,
    p_lng: input.lng,
    p_idempotency_key: input.idempotencyKey,
    p_severity: input.severity,
    p_description: input.description || undefined,
  });
  if (error) throw new Error(`create_traffic_report: ${error.message}`);
  return data as unknown as RpcResult;
}

export async function moderateTrafficReport(supabase: ServerSupabase, id: string, expected: string, to: string, note?: string) {
  const { data, error } = await supabase.rpc('moderate_traffic_report', { p_id: id, p_expected_status: expected, p_to: to, p_note: note || undefined });
  if (error) throw new Error(`moderate_traffic_report: ${error.message}`);
  return data as unknown as RpcResult;
}

export async function escalateTrafficReport(supabase: ServerSupabase, id: string, category: string) {
  const { data, error } = await supabase.rpc('escalate_traffic_report', { p_id: id, p_category: category });
  if (error) throw new Error(`escalate_traffic_report: ${error.message}`);
  return data as unknown as RpcResult;
}
