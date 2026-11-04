import 'server-only';
import type { ServerSupabase } from '@/lib/supabase/server';
import type { KpiSummary } from '@/types/kpi';
import { buildSeries, type PeriodRange, type SeriesPoint } from '../dashboard';
import { getKpis, getPanelCounts, type Municipality, type PanelCounts } from './queries';

export interface MunicipalityRow { id: string; name: string; received: number; resolved: number; openNow: number }
export interface ViewedRow { entity: 'business' | 'tourism_place' | 'eco_route'; id: string; name: string; href: string; views: number; directions: number; whatsapp: number }

export interface Dashboard {
  range: PeriodRange;
  kpis: KpiSummary;
  prev: KpiSummary;
  series: SeriesPoint[];
  byMunicipality: MunicipalityRow[] | null;
  topViewed: ViewedRow[];
  oldestPending: { traffic: string | null; request: string | null };
  counts: PanelCounts;
  generatedAt: string;
}

/** Límites del periodo como instantes de Santo Domingo (UTC−4, sin horario de verano), igual que kpi_summary. */
const startOf = (day: string) => `${day}T00:00:00-04:00`;
const endOf = (day: string) => new Date(new Date(`${day}T00:00:00-04:00`).getTime() + 86_400_000).toISOString();

const HREF = { business: '/negocios/', tourism_place: '/turismo/', eco_route: '/rutas/' } as const;

/**
 * Todo lo que muestra el dashboard, en una sola ronda de consultas en paralelo.
 * Los totales salen de kpi_summary (la misma función del PDF semanal); el gráfico cuenta las mismas filas por día,
 * así que la suma del gráfico coincide con el indicador. RLS limita todo al alcance de quien mira.
 */
export async function getDashboard(supabase: ServerSupabase, range: PeriodRange, municipalityId: string | null, municipalities: Municipality[]): Promise<Dashboard | null> {
  const from = startOf(range.from);
  const to = endOf(range.to);
  const byMuni = <T extends { eq: (c: string, v: string) => T }>(q: T, col = 'municipality_id') => (municipalityId ? q.eq(col, municipalityId) : q);

  const traffic = byMuni(supabase.from('traffic_reports').select('created_at').gte('created_at', from).lt('created_at', to).limit(5000));
  const requests = byMuni(supabase.from('citizen_requests').select('created_at').gte('created_at', from).lt('created_at', to).limit(5000));
  const resolved = byMuni(
    supabase.from('request_status_history').select('created_at, citizen_requests!inner(municipality_id)').eq('to_status', 'resolved').gte('created_at', from).lt('created_at', to).limit(5000),
    'citizen_requests.municipality_id',
  );
  const oldestTraffic = byMuni(supabase.from('traffic_reports').select('created_at').eq('status', 'pending').order('created_at').limit(1));
  const oldestRequest = byMuni(supabase.from('citizen_requests').select('created_at').in('status', ['pending', 'under_review']).order('created_at').limit(1));
  const engagement = supabase.from('engagement_daily').select('entity_type, entity_id, metric, count').gte('day', range.from).lte('day', range.to).limit(10000);
  const perMuni = !municipalityId && municipalities.length > 1
    ? Promise.all(municipalities.map(async (m) => ({ m, k: await getKpis(supabase, range.from, range.to, m.id) })))
    : Promise.resolve(null);

  const [kpis, prev, t, r, res, ot, orq, eng, muni, counts] = await Promise.all([
    getKpis(supabase, range.from, range.to, municipalityId),
    getKpis(supabase, range.prevFrom, range.prevTo, municipalityId),
    traffic, requests, resolved, oldestTraffic, oldestRequest, engagement, perMuni, getPanelCounts(supabase, municipalityId),
  ]);
  if ('status' in kpis || 'status' in prev) return null;

  const series = buildSeries(range, [...(t.data ?? []), ...(r.data ?? [])].map((x) => x.created_at), (res.data ?? []).map((x) => x.created_at));

  const byMunicipality = muni
    ? muni.flatMap(({ m, k }) => ('status' in k ? [] : [{ id: m.id, name: m.name, received: k.traffic.received + k.requests.received, resolved: k.requests.resolved, openNow: k.requests.open_now }]))
        .sort((a, b) => b.received - a.received)
    : null;

  return {
    range, kpis, prev, series, byMunicipality,
    topViewed: await topViewed(supabase, eng.data ?? [], municipalityId),
    oldestPending: { traffic: ot.data?.[0]?.created_at ?? null, request: orq.data?.[0]?.created_at ?? null },
    counts,
    generatedAt: new Date().toISOString(),
  };
}

/** Las 5 fichas con más visitas del periodo, con sus clics en "Cómo llegar" y WhatsApp. */
async function topViewed(supabase: ServerSupabase, rows: { entity_type: string; entity_id: string; metric: string; count: number }[], municipalityId: string | null): Promise<ViewedRow[]> {
  const agg = new Map<string, { entity: ViewedRow['entity']; id: string; views: number; directions: number; whatsapp: number }>();
  for (const row of rows) {
    const key = `${row.entity_type}:${row.entity_id}`;
    const a = agg.get(key) ?? { entity: row.entity_type as ViewedRow['entity'], id: row.entity_id, views: 0, directions: 0, whatsapp: 0 };
    if (row.metric === 'view') a.views += row.count;
    else if (row.metric === 'directions') a.directions += row.count;
    else if (row.metric === 'whatsapp') a.whatsapp += row.count;
    agg.set(key, a);
  }
  // Se piden nombres solo de las 20 más vistas: con filtro de municipio puede hacer falta descartar algunas
  const candidates = [...agg.values()].sort((a, b) => b.views - a.views).slice(0, 20);
  if (!candidates.length) return [];
  const ids = (e: ViewedRow['entity']) => candidates.filter((c) => c.entity === e).map((c) => c.id);
  const lookup = async (table: 'businesses' | 'tourism_places' | 'eco_routes', list: string[]) =>
    list.length ? (await supabase.from(table).select('id, name, municipality_id').in('id', list)).data ?? [] : [];
  const [b, p, rt] = await Promise.all([lookup('businesses', ids('business')), lookup('tourism_places', ids('tourism_place')), lookup('eco_routes', ids('eco_route'))]);
  const info = new Map([...b, ...p, ...rt].map((x) => [x.id, x]));
  return candidates
    .filter((c) => info.has(c.id) && (!municipalityId || info.get(c.id)!.municipality_id === municipalityId))
    .slice(0, 5)
    .map((c) => ({ ...c, name: info.get(c.id)!.name, href: HREF[c.entity] + c.id }));
}
