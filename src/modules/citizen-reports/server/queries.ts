import 'server-only';
import type { ServerSupabase } from '@/lib/supabase/server';
import { municipalityNames } from '@/lib/catalogs';

export interface MyActivity {
  requests: { id: string; kind: string; category: string; title: string; status: string; support_count: number; rejection_reason: string | null; resolution_note: string | null; created_at: string }[];
  traffic_reports: { id: string; type: string; status: string; expires_at: string; created_at: string }[];
  votes: string[];
}

/** Lo propio del usuario (my_activity, §9.2). */
export async function getMyActivity(supabase: ServerSupabase): Promise<MyActivity> {
  const { data, error } = await supabase.rpc('my_activity');
  if (error) throw new Error(`my_activity: ${error.message}`);
  const d = (data ?? {}) as Partial<MyActivity>;
  return { requests: d.requests ?? [], traffic_reports: d.traffic_reports ?? [], votes: d.votes ?? [] };
}

export interface RequestDetail {
  id: string;
  kind: string;
  category: string;
  title: string;
  description: string;
  status: string;
  is_public: boolean;
  support_count: number;
  resolution_note: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  municipality: string | null;
  point: { lat: number; lng: number } | null;
  history: { id: number; from_status: string | null; to_status: string; note: string | null; created_at: string }[];
}

/** Ficha de una consulta. RLS decide si se puede ver (autor, personal o pública aprobada). */
export async function getRequestDetail(supabase: ServerSupabase, id: string): Promise<RequestDetail | null> {
  const { data: r } = await supabase
    .from('citizen_requests')
    .select('id, kind, category, title, description, status, is_public, support_count, resolution_note, rejection_reason, created_at, updated_at, geom, municipality_id')
    .eq('id', id)
    .maybeSingle();
  if (!r) return null;
  const [{ data: history }, muniNames] = await Promise.all([
    supabase.from('request_status_history').select('id, from_status, to_status, note, created_at').eq('request_id', id).order('created_at'),
    municipalityNames(),
  ]);
  const g = r.geom as { coordinates?: [number, number] } | null;
  return {
    ...r,
    municipality: muniNames.get(r.municipality_id) ?? null,
    point: g?.coordinates ? { lng: g.coordinates[0], lat: g.coordinates[1] } : null,
    history: history ?? [],
  } as RequestDetail;
}

/** Consultas públicas abiertas más apoyadas (para votar prioridades, F5). */
export async function listPublicRequests(supabase: ServerSupabase, limit = 20) {
  const { data } = await supabase
    .from('citizen_requests')
    .select('id, title, category, status, support_count, created_at, municipality_id')
    .eq('is_public', true)
    .in('status', ['approved', 'in_progress', 'resolved'])
    .order('support_count', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);
  return data ?? [];
}
