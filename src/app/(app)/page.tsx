import { Explorer } from './_components/explorer';
import { Discover, type DiscoverItem } from './_components/discover';
import { coverPhotos } from '@/modules/media/server';
import { listRoutes } from '@/modules/routes/server';
import { listPlaces } from '@/modules/tourism/server';
import { countActiveAlerts } from '@/modules/traffic/server';
import { getLabelMaps } from '@/lib/catalogs';
import { createAnonClient } from '@/lib/supabase/anon';
import { formatKm, formatMinutes } from '@/utils/format';

// Primero lo que más atrae a quien visita la provincia (la Presa de Monción antes que una capilla)
const KIND_ORDER = ['naturaleza', 'mirador', 'rio_balneario', 'agroturismo', 'historico', 'cultural'];
const kindRank = (kind: string) => (KIND_ORDER.includes(kind) ? KIND_ORDER.indexOf(kind) : KIND_ORDER.length);

export default async function HomePage() {
  // Cliente anónimo: la portada es igual para todos y se puede cachear
  const supabase = createAnonClient();
  const [labels, places, routes, alerts] = await Promise.all([
    getLabelMaps(),
    listPlaces(supabase),
    listRoutes(supabase),
    countActiveAlerts(supabase),
  ]);
  // Lo primero que se ve de la provincia son fotos reales: las fichas con foto van delante
  const [placeCovers, routeCovers] = await Promise.all([
    coverPhotos(supabase, 'tourism_place_id', places.map((p) => p.id)),
    coverPhotos(supabase, 'eco_route_id', routes.map((r) => r.id)),
  ]);
  const withPhotoFirst = <T extends { id: string }>(covers: Map<string, string>) => (a: T, b: T) => Number(covers.has(b.id)) - Number(covers.has(a.id));
  const items: DiscoverItem[] = [
    ...[...places].sort((a, b) => withPhotoFirst(placeCovers)(a, b) || kindRank(a.kind) - kindRank(b.kind)).slice(0, 8)
      .map((p) => ({ id: p.id, layer: 'tourism' as const, title: p.name, subtitle: `${labels.categories[p.kind] ?? 'Turismo'} · ${p.municipality}`, image: placeCovers.get(p.id) })),
    ...[...routes].sort(withPhotoFirst(routeCovers)).slice(0, 6).map((r) => ({
      id: r.id, layer: 'route' as const, title: r.name, image: routeCovers.get(r.id),
      subtitle: [r.distance_km ? formatKm(r.distance_km) : null, formatMinutes(r.duration_min), labels.categories[r.difficulty]].filter(Boolean).join(' · '),
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
