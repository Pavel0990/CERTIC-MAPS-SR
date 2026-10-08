import 'server-only';
import type { ServerSupabase } from '@/lib/supabase/server';
import { municipalityNames } from '@/lib/catalogs';

export interface PlaceDetail {
  id: string;
  name: string;
  kind: string;
  description: string | null;
  services: Record<string, unknown>;
  accessibility: string | null;
  opening_info: string | null;
  status: string;
  status_reason: string | null;
  updated_at: string;
  version: number;
  municipality_id: string;
  municipality: string | null;
  point: { lat: number; lng: number };
}

/** Ficha de un lugar turístico. RLS decide si se puede ver (publicado, quien lo propuso o personal del municipio). */
export async function getPlaceDetail(supabase: ServerSupabase, id: string): Promise<PlaceDetail | null> {
  const { data: p } = await supabase
    .from('tourism_places')
    .select('id, name, kind, description, services, accessibility, opening_info, status, status_reason, updated_at, version, geom, municipality_id')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();
  if (!p) return null;
  const g = p.geom as { coordinates?: [number, number] } | null;
  if (!g?.coordinates) return null;
  return {
    id: p.id,
    name: p.name,
    kind: p.kind,
    description: p.description,
    services: (p.services ?? {}) as Record<string, unknown>,
    accessibility: p.accessibility,
    opening_info: p.opening_info,
    status: p.status,
    status_reason: p.status_reason,
    updated_at: p.updated_at,
    version: p.version,
    municipality_id: p.municipality_id,
    municipality: (await municipalityNames()).get(p.municipality_id) ?? null,
    point: { lng: g.coordinates[0], lat: g.coordinates[1] },
  };
}

export interface PlaceListItem { id: string; name: string; kind: string; municipality: string }

/** Listado público de lugares turísticos publicados, con filtros por municipio y tipo. */
export async function listPlaces(supabase: ServerSupabase, filters: { municipalityId?: string; kind?: string } = {}): Promise<PlaceListItem[]> {
  let query = supabase.from('tourism_places').select('id, name, kind, municipality_id').eq('status', 'published').is('deleted_at', null).order('name').limit(200);
  if (filters.municipalityId) query = query.eq('municipality_id', filters.municipalityId);
  if (filters.kind) query = query.eq('kind', filters.kind);
  const [{ data: rows }, muniName] = await Promise.all([query, municipalityNames()]);
  return (rows ?? []).map((p) => ({ id: p.id, name: p.name, kind: p.kind, municipality: muniName.get(p.municipality_id) ?? '' }));
}
