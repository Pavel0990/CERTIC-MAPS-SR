import { Explorer } from './_components/explorer';
import { Discover, type DiscoverItem } from './_components/discover';
import { getLabelMaps } from '@/lib/catalogs';
import { createAnonClient } from '@/lib/supabase/anon';
import { formatMinutes } from '@/utils/format';

export default async function HomePage() {
  const supabase = createAnonClient();
  const [labels, places, routes, alerts, munis] = await Promise.all([
    getLabelMaps(),
    supabase.from('tourism_places').select('id, name, kind, municipality_id').eq('status', 'published').is('deleted_at', null).limit(8),
    supabase.from('eco_routes').select('id, name, difficulty, duration_min, distance_km, municipality_id').eq('status', 'published').is('deleted_at', null).limit(6),
    supabase.from('traffic_reports').select('id', { count: 'exact', head: true }).in('status', ['active', 'verified']).gt('expires_at', new Date().toISOString()),
    supabase.from('municipalities').select('id, name'),
  ]);
  const muni = new Map((munis.data ?? []).map((m) => [m.id, m.name]));
  const items: DiscoverItem[] = [
    ...(places.data ?? []).map((p) => ({ id: p.id, layer: 'tourism' as const, title: p.name, subtitle: `${labels.categories[p.kind] ?? 'Turismo'} · ${muni.get(p.municipality_id) ?? ''}` })),
    ...(routes.data ?? []).map((r) => ({
      id: r.id, layer: 'route' as const, title: r.name,
      subtitle: [r.distance_km ? `${Number(r.distance_km).toFixed(1).replace('.', ',')} km` : null, formatMinutes(r.duration_min), labels.categories[r.difficulty]].filter(Boolean).join(' · '),
    })),
  ];
  return (
    <div className="h-[calc(100dvh-68px-env(safe-area-inset-bottom))] md:h-dvh">
      <h1 className="sr-only">SR Conecta: Santiago Rodríguez en un solo mapa</h1>
      <Explorer catalogs={labels}>
        <Discover items={items} alerts={alerts.count ?? 0} />
      </Explorer>
    </div>
  );
}
