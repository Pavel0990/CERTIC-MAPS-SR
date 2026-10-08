import 'server-only';
import { municipalityNames } from '@/lib/catalogs';
import { createAnonClient } from '@/lib/supabase/anon';
import { ALL_LAYERS, clampBBox } from '../layers';
import type { BBox, LayerId, MapFeatureCollection, MunicipalityAggregate, StaticLayers } from '../types';

/** Capas públicas del viewport. Se ejecuta como `anon`: la respuesta es cacheable y nunca personal. */
export async function fetchFeatures(bbox: BBox, layers: LayerId[]) {
  const b = clampBBox(bbox);
  const supabase = createAnonClient();
  const { data, error } = await supabase.rpc('map_features', {
    p_min_lng: b.minLng, p_min_lat: b.minLat, p_max_lng: b.maxLng, p_max_lat: b.maxLat,
    p_layers: layers.length ? layers : ALL_LAYERS, p_limit: 500,
  });
  if (error) throw new Error(`map_features: ${error.message}`);
  return data as unknown as MapFeatureCollection | { status: 'rejected'; reason: string };
}

export async function fetchAggregates() {
  const { data, error } = await createAnonClient().rpc('map_aggregates');
  if (error) throw new Error(`map_aggregates: ${error.message}`);
  return (data ?? []) as unknown as MunicipalityAggregate[];
}

/** Capas pequeñas y estables: límites municipales y trazados de rutas, simplificados (§7.1). */
export async function fetchStaticLayers(): Promise<StaticLayers> {
  const supabase = createAnonClient();
  const [provinces, municipalities, routes] = await Promise.all([
    supabase.from('provinces').select('id').eq('code', process.env.DEFAULT_PROVINCE_CODE ?? 'SR').maybeSingle(),
    supabase.from('municipalities').select('id, name, geom_simplified'),
    supabase.from('eco_routes').select('id, name, difficulty, geom_simplified').eq('status', 'published').is('deleted_at', null),
  ]);
  if (municipalities.error) throw new Error(`municipalities: ${municipalities.error.message}`);
  if (routes.error) throw new Error(`eco_routes: ${routes.error.message}`);
  return {
    provinceId: provinces.data?.id ?? null,
    municipalities: {
      type: 'FeatureCollection',
      features: (municipalities.data ?? []).filter((m) => m.geom_simplified).map((m) => ({
        type: 'Feature', geometry: m.geom_simplified as never, properties: { id: m.id, name: m.name },
      })),
    },
    routes: {
      type: 'FeatureCollection',
      features: (routes.data ?? []).filter((r) => r.geom_simplified).map((r) => ({
        type: 'Feature', geometry: r.geom_simplified as never, properties: { id: r.id, title: r.name, difficulty: r.difficulty },
      })),
    },
  };
}

export interface SearchHit {
  layer: 'business' | 'tourism' | 'route';
  id: string;
  name: string;
  municipality: string | null;
  point: { lat: number; lng: number } | null;
}

const ENTITY_LAYER = { business: 'business', tourism_place: 'tourism', eco_route: 'route' } as const;

/** Búsqueda propia (FTS + trigramas, §9.1) con la coordenada de cada resultado para centrar el mapa. */
export async function searchPlaces(q: string, limit = 12): Promise<SearchHit[]> {
  const supabase = createAnonClient();
  const { data, error } = await supabase.rpc('search_all', { p_q: q, p_limit: limit });
  if (error) throw new Error(`search_all: ${error.message}`);
  const hits = data ?? [];
  if (!hits.length) return [];
  const ids = (entity: string) => hits.filter((h) => h.entity === entity).map((h) => h.id);
  type Geo = { id: string; geom?: unknown; start_point?: unknown };
  const [biz, places, routes, muniName] = await Promise.all([
    ids('business').length ? supabase.from('businesses').select('id, geom').in('id', ids('business')) : { data: [] as Geo[] },
    ids('tourism_place').length ? supabase.from('tourism_places').select('id, geom').in('id', ids('tourism_place')) : { data: [] as Geo[] },
    ids('eco_route').length ? supabase.from('eco_routes').select('id, start_point').in('id', ids('eco_route')) : { data: [] as Geo[] },
    municipalityNames(),
  ]);
  const coords = new Map<string, { lat: number; lng: number }>();
  for (const row of [...(biz.data ?? []), ...(places.data ?? []), ...(routes.data ?? [])] as Geo[]) {
    const g = (row.geom ?? row.start_point) as { coordinates?: [number, number] } | undefined;
    if (g?.coordinates) coords.set(row.id, { lng: g.coordinates[0], lat: g.coordinates[1] });
  }
  return hits.map((h) => ({
    layer: ENTITY_LAYER[h.entity as keyof typeof ENTITY_LAYER] ?? 'business',
    id: h.id,
    name: h.name,
    municipality: muniName.get(h.municipality_id) ?? null,
    point: coords.get(h.id) ?? null,
  }));
}
