import 'server-only';
import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { createAnonClient } from '@/lib/supabase/anon';
import { DIFFICULTY, PLACE_KIND } from '@/lib/vocabulary';

export interface Catalogs {
  trafficTypes: { code: string; name: string; icon: string; default_severity: number }[];
  requestCategories: { code: string; kind: 'incident' | 'inquiry'; name: string; icon: string }[];
  businessCategories: { id: string; slug: string; name: string; icon: string }[];
  municipalities: { id: string; code: string; name: string }[];
}

/** Etiqueta de la caché: la acción que edita un catálogo la invalida y el cambio se ve en el siguiente request. */
export const CATALOGS_TAG = 'catalogs';

/**
 * Catálogos públicos editables sin deploy (§8.5). Casi nunca cambian y casi todas las pantallas los usan:
 * se guardan entre requests (en vez de 4 consultas por pantalla) y se renuevan al editarlos o cada hora.
 */
export const getCatalogs = cache(unstable_cache(async (): Promise<Catalogs> => {
  const supabase = createAnonClient();
  const [t, r, b, m] = await Promise.all([
    supabase.from('traffic_report_types').select('code, name, icon, default_severity').eq('active', true).order('sort'),
    supabase.from('request_categories').select('code, kind, name, icon').eq('active', true).order('sort'),
    supabase.from('business_categories').select('id, slug, name, icon').eq('active', true).order('sort'),
    supabase.from('municipalities').select('id, code, name').order('name'),
  ]);
  // Un fallo no se guarda en la caché (si no, quedarían catálogos vacíos durante una hora)
  const failed = t.error ?? r.error ?? b.error ?? m.error;
  if (failed) throw new Error(`catalogs: ${failed.message}`);
  return {
    trafficTypes: t.data ?? [],
    requestCategories: (r.data ?? []) as Catalogs['requestCategories'],
    businessCategories: b.data ?? [],
    municipalities: m.data ?? [],
  };
}, ['catalogs-v1'], { tags: [CATALOGS_TAG], revalidate: 3600 }));

/** Mapas código → nombre para el mapa y las listas. */
export async function getLabelMaps() {
  const c = await getCatalogs();
  // Los textos salen de vocabulary.ts (ARCHITECTURE §15), no de una copia aquí
  return {
    trafficTypes: Object.fromEntries(c.trafficTypes.map((x) => [x.code, x.name])),
    categories: {
      ...PLACE_KIND,
      ...Object.fromEntries(Object.entries(DIFFICULTY).map(([k, d]) => [k, d.phrase])),
      ...Object.fromEntries(c.businessCategories.map((x) => [x.slug, x.name])),
      ...Object.fromEntries(c.requestCategories.map((x) => [x.code, x.name])),
    },
  };
}

/** id → nombre de municipio, desde el catálogo cacheado (una sola consulta por request). */
export async function municipalityNames(): Promise<Map<string, string>> {
  const { municipalities } = await getCatalogs();
  return new Map(municipalities.map((m) => [m.id, m.name]));
}
