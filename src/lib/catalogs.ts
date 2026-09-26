import 'server-only';
import { cache } from 'react';
import { createAnonClient } from '@/lib/supabase/anon';

export interface Catalogs {
  trafficTypes: { code: string; name: string; default_severity: number }[];
  requestCategories: { code: string; kind: 'incident' | 'inquiry'; name: string }[];
  businessCategories: { id: string; slug: string; name: string }[];
  municipalities: { id: string; code: string; name: string }[];
}

/** Catálogos públicos editables sin deploy (§8.5). Una lectura por request. */
export const getCatalogs = cache(async (): Promise<Catalogs> => {
  const supabase = createAnonClient();
  const [t, r, b, m] = await Promise.all([
    supabase.from('traffic_report_types').select('code, name, default_severity').eq('active', true).order('sort'),
    supabase.from('request_categories').select('code, kind, name').eq('active', true).order('sort'),
    supabase.from('business_categories').select('id, slug, name').eq('active', true).order('sort'),
    supabase.from('municipalities').select('id, code, name').order('name'),
  ]);
  return {
    trafficTypes: t.data ?? [],
    requestCategories: (r.data ?? []) as Catalogs['requestCategories'],
    businessCategories: b.data ?? [],
    municipalities: m.data ?? [],
  };
});

/** Mapas código → nombre para el mapa y las listas. */
export async function getLabelMaps() {
  const c = await getCatalogs();
  const PLACE: Record<string, string> = { mirador: 'Mirador', rio_balneario: 'Río o balneario', cultural: 'Sitio cultural', historico: 'Sitio histórico', agroturismo: 'Agroturismo', naturaleza: 'Naturaleza', otro: 'Otro' };
  const DIFF: Record<string, string> = { baja: 'Fácil', media: 'Dificultad media', alta: 'Difícil' };
  return {
    trafficTypes: Object.fromEntries(c.trafficTypes.map((x) => [x.code, x.name])),
    categories: {
      ...PLACE,
      ...DIFF,
      ...Object.fromEntries(c.businessCategories.map((x) => [x.slug, x.name])),
      ...Object.fromEntries(c.requestCategories.map((x) => [x.code, x.name])),
    },
  };
}
