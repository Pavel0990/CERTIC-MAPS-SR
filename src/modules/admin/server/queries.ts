import 'server-only';
import type { ServerSupabase } from '@/lib/supabase/server';
import type { KpiSummary } from '@/types/kpi';

// Lecturas del panel municipal (§9.7). Todas usan el JWT del personal: RLS limita a su alcance.

export interface Municipality { id: string; name: string; code: string }

/** Municipios que puede gestionar el usuario: todos si es provincial, si no los de sus roles. */
export function scopeMunicipalities(all: Municipality[], roles: { role: string; municipality_id: string | null }[]) {
  const staff = roles.filter((r) => r.role === 'moderator' || r.role === 'municipal_admin');
  if (staff.some((r) => r.municipality_id === null)) return all;
  const ids = new Set(staff.map((r) => r.municipality_id));
  return all.filter((m) => ids.has(m.id));
}

export interface TrafficItem {
  id: string; type: string; severity: number; description: string | null; status: string;
  created_at: string; expires_at: string; municipality_id: string | null; point: { lat: number; lng: number } | null;
}

const point = (g: unknown) => {
  const c = (g as { coordinates?: [number, number] } | null)?.coordinates;
  return c ? { lng: c[0], lat: c[1] } : null;
};

export async function listTrafficInbox(supabase: ServerSupabase, opts: { status?: string; municipalityId?: string }) {
  let q = supabase
    .from('traffic_reports')
    .select('id, type, severity, description, status, created_at, expires_at, municipality_id, geom')
    .order('severity', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(100);
  q = opts.status ? q.eq('status', opts.status) : q.in('status', ['pending', 'active', 'verified', 'out_of_area']);
  if (opts.municipalityId) q = q.eq('municipality_id', opts.municipalityId);
  const { data } = await q;
  return (data ?? []).map((t) => ({ ...t, point: point(t.geom) })) as TrafficItem[];
}

export interface RequestItem {
  id: string; kind: string; category: string; title: string; description: string; status: string;
  is_public: boolean; support_count: number; created_at: string; updated_at: string; municipality_id: string;
  assignee: { id: string; name: string } | null;
}

export async function listRequestInbox(supabase: ServerSupabase, opts: { status?: string; municipalityId?: string }) {
  let q = supabase
    .from('citizen_requests')
    .select('id, kind, category, title, description, status, is_public, support_count, created_at, updated_at, municipality_id')
    .order('support_count', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(100);
  q = opts.status ? q.eq('status', opts.status) : q.in('status', ['pending', 'under_review', 'approved', 'in_progress']);
  if (opts.municipalityId) q = q.eq('municipality_id', opts.municipalityId);
  const { data } = await q;
  const rows = data ?? [];
  // Responsable de cada consulta: assigned_to está oculto por columna; solo el personal lo ve por RPC (migración 250)
  const { data: assignees } = rows.length ? await supabase.rpc('request_assignees', { p_ids: rows.map((r) => r.id) }) : { data: [] };
  const byId = new Map((assignees ?? []).map((a) => [a.request_id, { id: a.assignee_id, name: a.assignee_name }]));
  return rows.map((r) => ({ ...r, assignee: byId.get(r.id) ?? null })) as RequestItem[];
}

export async function staffDirectory(supabase: ServerSupabase, municipalityId: string) {
  const { data } = await supabase.rpc('staff_directory', { p_municipality_id: municipalityId });
  return (data ?? []) as { user_id: string; display_name: string; role: string; provincial: boolean }[];
}

/** Cola de validación: negocios, lugares, rutas, promociones y fotos pendientes (§9.7). */
export async function listValidationQueue(supabase: ServerSupabase) {
  const [biz, places, routes, promos, photos] = await Promise.all([
    supabase.from('businesses').select('id, name, status, description, phone, created_at, municipality_id, category_id').in('status', ['pending', 'under_review']).order('created_at'),
    supabase.from('tourism_places').select('id, name, kind, description, status, created_at, municipality_id').eq('status', 'pending').order('created_at'),
    supabase.from('eco_routes').select('id, name, kind, difficulty, duration_min, distance_km, description, status, created_at, municipality_id').eq('status', 'pending').order('created_at'),
    supabase.from('promotions').select('id, title, description, valid_from, valid_until, status, created_at, business_id').eq('status', 'pending').order('created_at'),
    supabase.from('attachments').select('id, bucket, path, status, created_at, business_id, tourism_place_id, eco_route_id, traffic_report_id, citizen_request_id').eq('status', 'processed').order('created_at').limit(50),
  ]);
  const photoRows = photos.data ?? [];
  const signed = await Promise.all(
    photoRows.map(async (p) => (await supabase.storage.from(p.bucket).createSignedUrl(p.path, 300)).data?.signedUrl ?? null),
  );
  return {
    businesses: biz.data ?? [],
    places: places.data ?? [],
    routes: routes.data ?? [],
    promotions: promos.data ?? [],
    photos: photoRows.map((p, i) => ({ ...p, url: signed[i] })),
  };
}

export async function getKpis(supabase: ServerSupabase, from: string, to: string, municipalityId: string | null) {
  const { data, error } = await supabase.rpc('kpi_summary', { p_from: from, p_to: to, p_municipality_id: municipalityId ?? undefined });
  if (error) throw new Error(`kpi_summary: ${error.message}`);
  return data as unknown as Kpis | { status: 'rejected'; reason: string };
}

export type Kpis = KpiSummary;

export async function listReportRuns(supabase: ServerSupabase) {
  const { data } = await supabase.from('report_runs').select('id, period_start, period_end, version, status, trigger, attempts, storage_path, error, started_at, finished_at').order('period_start', { ascending: false }).order('version', { ascending: false }).limit(30);
  return data ?? [];
}

export async function listAudit(supabase: ServerSupabase, opts: { action?: string; limit?: number }) {
  let q = supabase.from('audit_logs').select('created_at, id, actor_role, action, entity_type, entity_id, result, municipality_id, actor_id').order('created_at', { ascending: false }).limit(opts.limit ?? 100);
  if (opts.action) q = q.like('action', `${opts.action}%`);
  const { data } = await q;
  const rows = data ?? [];
  const actorIds = [...new Set(rows.map((r) => r.actor_id).filter(Boolean))] as string[];
  const { data: profiles } = actorIds.length ? await supabase.from('profiles').select('id, display_name').in('id', actorIds) : { data: [] };
  const names = new Map((profiles ?? []).map((p) => [p.id, p.display_name]));
  return rows.map((r) => ({ ...r, actor_name: r.actor_id ? names.get(r.actor_id) ?? 'Usuario' : 'Sistema' }));
}

/** Personas con roles de personal en el alcance del administrador (para la sección Equipo). */
export async function listTeam(supabase: ServerSupabase) {
  const { data: roles } = await supabase.from('user_roles').select('id, user_id, role, municipality_id, created_at').in('role', ['moderator', 'municipal_admin']).order('created_at');
  const ids = [...new Set((roles ?? []).map((r) => r.user_id))];
  const { data: profiles } = ids.length ? await supabase.from('profiles').select('id, display_name').in('id', ids) : { data: [] };
  const names = new Map((profiles ?? []).map((p) => [p.id, p.display_name]));
  return (roles ?? []).map((r) => ({ ...r, name: names.get(r.user_id) ?? 'Usuario' }));
}

/** Buscar personas registradas por nombre (el personal puede leer perfiles, §10.2). */
export async function searchPeople(supabase: ServerSupabase, q: string) {
  if (q.trim().length < 2) return [];
  const { data } = await supabase.from('profiles').select('id, display_name, home_municipality_id').ilike('display_name', `%${q.trim()}%`).limit(10);
  return data ?? [];
}

export type CatalogKey = 'traffic_types' | 'request_categories' | 'business_categories';
export interface CatalogItem {
  code: string;
  name: string;
  icon: string;
  sort: number;
  active: boolean;
  in_use: number;
  kind?: 'incident' | 'inquiry';
  default_severity?: number;
  default_ttl_hours?: number;
}
export type CatalogLists = Record<CatalogKey, CatalogItem[]>;

/** Catálogos completos, también lo desactivado (solo administración provincial; la RPC lo verifica). */
export async function listCatalogs(supabase: ServerSupabase): Promise<CatalogLists | null> {
  const { data, error } = await supabase.rpc('catalog_admin_list');
  if (error) throw new Error(`catalog_admin_list: ${error.message}`);
  const r = data as unknown as ({ status: 'ok' } & CatalogLists) | { status: 'rejected' };
  return r.status === 'ok' ? { traffic_types: r.traffic_types, request_categories: r.request_categories, business_categories: r.business_categories } : null;
}

export interface PanelCounts {
  trafficPending: number;
  requestsPending: number;
  requestsInReview: number;
  /** Negocios, lugares, rutas y promociones esperando revisión */
  validations: number;
}

/** Trabajo pendiente del personal (menú del panel y resumen de moderación). RLS limita a su alcance. */
export async function getPanelCounts(supabase: ServerSupabase): Promise<PanelCounts> {
  const head = { count: 'exact', head: true } as const;
  const [traffic, reqPending, reqReview, biz, places, routes, promos] = await Promise.all([
    supabase.from('traffic_reports').select('id', head).eq('status', 'pending'),
    supabase.from('citizen_requests').select('id', head).eq('status', 'pending'),
    supabase.from('citizen_requests').select('id', head).eq('status', 'under_review'),
    supabase.from('businesses').select('id', head).in('status', ['pending', 'under_review']),
    supabase.from('tourism_places').select('id', head).eq('status', 'pending'),
    supabase.from('eco_routes').select('id', head).eq('status', 'pending'),
    supabase.from('promotions').select('id', head).eq('status', 'pending'),
  ]);
  return {
    trafficPending: traffic.count ?? 0,
    requestsPending: reqPending.count ?? 0,
    requestsInReview: reqReview.count ?? 0,
    validations: (biz.count ?? 0) + (places.count ?? 0) + (routes.count ?? 0) + (promos.count ?? 0),
  };
}
