import 'server-only';
import type { ServerSupabase } from '@/lib/supabase/server';
import { municipalityNames } from '@/lib/catalogs';

type Position = [number, number];

export interface RouteDetail {
  id: string;
  name: string;
  kind: string;
  difficulty: string;
  duration_min: number;
  distance_km: number;
  description: string | null;
  services: Record<string, unknown>;
  status: string;
  status_reason: string | null;
  updated_at: string;
  version: number;
  municipality_id: string;
  municipalities: string[];
  /** Trazado simplificado para dibujar (MultiLineString). */
  lines: Position[][];
  start: { lat: number; lng: number };
  bounds: { minLng: number; minLat: number; maxLng: number; maxLat: number };
}

/** Ficha de una ruta. RLS decide si se puede ver (publicada, quien la propuso o personal del municipio). */
export async function getRouteDetail(supabase: ServerSupabase, id: string): Promise<RouteDetail | null> {
  const { data: r } = await supabase
    .from('eco_routes')
    .select('id, name, kind, difficulty, duration_min, distance_km, description, services, status, status_reason, updated_at, version, municipality_id, municipality_ids, geom_simplified, start_point')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();
  if (!r) return null;
  const lines = ((r.geom_simplified as { coordinates?: Position[][] } | null)?.coordinates ?? []).filter((l) => l.length >= 2);
  const start = (r.start_point as { coordinates?: Position } | null)?.coordinates;
  if (!lines.length || !start) return null;

  const ids = r.municipality_ids?.length ? r.municipality_ids : [r.municipality_id];
  const names = await municipalityNames();

  const all = lines.flat();
  return {
    id: r.id,
    name: r.name,
    kind: r.kind,
    difficulty: r.difficulty,
    duration_min: r.duration_min,
    distance_km: Number(r.distance_km),
    description: r.description,
    services: (r.services ?? {}) as Record<string, unknown>,
    status: r.status,
    status_reason: r.status_reason,
    updated_at: r.updated_at,
    version: r.version,
    municipality_id: r.municipality_id,
    municipalities: ids.map((i) => names.get(i)).filter((n): n is string => !!n),
    lines,
    start: { lng: start[0], lat: start[1] },
    bounds: {
      minLng: Math.min(...all.map((p) => p[0])),
      minLat: Math.min(...all.map((p) => p[1])),
      maxLng: Math.max(...all.map((p) => p[0])),
      maxLat: Math.max(...all.map((p) => p[1])),
    },
  };
}

export interface RouteListItem { id: string; name: string; kind: string; difficulty: string; duration_min: number; distance_km: number | null; municipality: string }

/** Listado público de rutas publicadas, de la más corta a la más larga. */
export async function listRoutes(supabase: ServerSupabase, filters: { municipalityId?: string } = {}): Promise<RouteListItem[]> {
  let query = supabase.from('eco_routes').select('id, name, kind, difficulty, duration_min, distance_km, municipality_id').eq('status', 'published').is('deleted_at', null).order('distance_km').limit(200);
  if (filters.municipalityId) query = query.contains('municipality_ids', [filters.municipalityId]);
  const [{ data: rows }, muniName] = await Promise.all([query, municipalityNames()]);
  return (rows ?? []).map((r) => ({
    id: r.id, name: r.name, kind: r.kind, difficulty: r.difficulty, duration_min: r.duration_min,
    distance_km: r.distance_km === null ? null : Number(r.distance_km), municipality: muniName.get(r.municipality_id) ?? '',
  }));
}
