import { Explorer } from './_components/explorer';
import { Discover, type DiscoverItem } from './_components/discover';
import { listRoutes } from '@/modules/routes/server';
import { listPlaces } from '@/modules/tourism/server';
import { countActiveAlerts } from '@/modules/traffic/server';
import { getLabelMaps } from '@/lib/catalogs';
import { createAnonClient } from '@/lib/supabase/anon';
import { formatMinutes } from '@/utils/format';

export default async function HomePage() {
  // Cliente anónimo: la portada es igual para todos y se puede cachear
  const supabase = createAnonClient();
  const [labels, places, routes, alerts] = await Promise.all([
    getLabelMaps(),
    listPlaces(supabase),
    listRoutes(supabase),
    countActiveAlerts(supabase),
  ]);
  const items: DiscoverItem[] = [
    ...places.slice(0, 8).map((p) => ({ id: p.id, layer: 'tourism' as const, title: p.name, subtitle: `${labels.categories[p.kind] ?? 'Turismo'} · ${p.municipality}` })),
    ...routes.slice(0, 6).map((r) => ({
      id: r.id, layer: 'route' as const, title: r.name,
      subtitle: [r.distance_km ? `${r.distance_km.toFixed(1).replace('.', ',')} km` : null, formatMinutes(r.duration_min), labels.categories[r.difficulty]].filter(Boolean).join(' · '),
    })),
  ];
  return (
    <div className="h-[calc(100dvh-68px-env(safe-area-inset-bottom))] md:h-dvh">
      <h1 className="sr-only">SR Conecta: Santiago Rodríguez en un solo mapa</h1>
      <Explorer catalogs={labels}>
        <Discover items={items} alerts={alerts} />
      </Explorer>
    </div>
  );
}
