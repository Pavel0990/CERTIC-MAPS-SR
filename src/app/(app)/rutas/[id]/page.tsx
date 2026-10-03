import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Clock, Footprints, MapPin, Mountain } from 'lucide-react';
import { getRouteDetail } from '@/modules/routes/server';
import { listServices } from '@/modules/tourism';
import { listPhotos } from '@/modules/media/server';
import { MapCanvas, type MapFeatureCollection, type StaticLayers } from '@/modules/map';
import { PageShell } from '@/components/shared/page';
import { TrackView } from '@/components/shared/engagement';
import { Badge, Card, Eyebrow } from '@/components/ui/primitives';
import { getViewer } from '@/lib/auth';
import { DIFFICULTY, ROUTE_KIND } from '@/lib/vocabulary';
import { createClient } from '@/lib/supabase/server';
import { formatDate, formatDistance, formatMinutes } from '@/utils/format';
import { DirectionsButton, HeaderActions, RejectedNotice, SecondaryLink, ServicesCard, StatusLine, UUID } from '../../_contenido/detail';
import { PhotoGallery } from '../../_contenido/photo-gallery';
import { canEditContent } from '../../_contenido/permissions';

/**
 * Centro y zoom para que el trazado quepa en un mapa de al menos 300×260 px (la tarjeta de la ficha).
 * MapLibre usa baldosas de 512 px. Se calcula aquí porque el encuadre automático del mapa no se ajusta bien en contenedores pequeños.
 */
function fitView(b: { minLng: number; minLat: number; maxLng: number; maxLat: number }) {
  const merc = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
  const dLng = Math.max(b.maxLng - b.minLng, 0.002);
  const dY = Math.max(merc(b.maxLat) - merc(b.minLat), 0.00004);
  const zoom = Math.min(Math.log2((300 * 360) / (512 * dLng)), Math.log2((260 * 2 * Math.PI) / (512 * dY))) - 0.4;
  return { center: { lng: (b.minLng + b.maxLng) / 2, lat: (b.minLat + b.maxLat) / 2 }, zoom: Math.max(8, Math.min(16, zoom)) };
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  if (!UUID.test(id)) return { title: 'Ruta' };
  const r = await getRouteDetail(await createClient(), id);
  return { title: r?.name ?? 'Ruta', description: r?.description?.slice(0, 160) ?? undefined };
}

export default async function RoutePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const supabase = await createClient();
  const [r, photos, viewer] = await Promise.all([getRouteDetail(supabase, id), listPhotos(supabase, 'eco_route_id', id), getViewer()]);
  if (!r) notFound();

  const published = r.status === 'published';
  const difficulty = DIFFICULTY[r.difficulty];
  const line: StaticLayers = {
    provinceId: null,
    municipalities: { type: 'FeatureCollection', features: [] },
    routes: { type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'MultiLineString', coordinates: r.lines }, properties: { id: r.id, title: r.name, difficulty: r.difficulty } }] },
  };
  const startPin: MapFeatureCollection = {
    type: 'FeatureCollection',
    features: [{ type: 'Feature', geometry: { type: 'Point', coordinates: [r.start.lng, r.start.lat] }, properties: { id: r.id, layer: 'route', title: `Inicio de ${r.name}` } }],
  };
  const view = fitView(r.bounds);

  return (
    <PageShell
      back={{ href: '/mapa?capas=route', label: 'Mapa' }}
      eyebrow={`Ruta ${(ROUTE_KIND[r.kind] ?? '').toLowerCase()}${r.municipalities.length ? ` · ${r.municipalities.join(', ')}` : ''}`}
      title={r.name}
      actions={
        <HeaderActions>
          <DirectionsButton entity="eco_route" id={r.id} point={r.start} label="Cómo llegar al inicio" />
          {canEditContent(viewer, r.municipality_id, r.status) && <SecondaryLink href={`/rutas/${r.id}/editar`}>Editar</SecondaryLink>}
        </HeaderActions>
      }
      description={published ? undefined : <StatusLine status={r.status} />}
    >
      {published && <TrackView entity="eco_route" id={r.id} />}
      <dl className="mb-4 grid grid-cols-3 gap-2">
        <Fact icon={<Footprints className="size-5" />} label="Distancia" value={formatDistance(r.distance_km)} />
        <Fact icon={<Clock className="size-5" />} label="Duración" value={formatMinutes(r.duration_min)} />
        <Fact icon={<Mountain className="size-5" />} label="Dificultad" value={difficulty ? <Badge tone={difficulty.tone}>{difficulty.label}</Badge> : r.difficulty} />
      </dl>
      <div className="grid gap-4 md:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-4">
          {r.status === 'rejected' && <RejectedNotice reason={r.status_reason} />}
          <div className="relative h-[300px] overflow-hidden rounded-[18px] shadow-[var(--shadow-card)] md:h-[380px]">
            <MapCanvas className="absolute inset-0" staticLayers={line} features={startPin} initialView={view} ariaLabel={`Mapa con el trazado de ${r.name}`} />
          </div>
          <p className="-mt-2 flex items-center gap-2 text-sm text-muted">
            <MapPin className="size-4" aria-hidden /> El ícono marca el punto de inicio.
          </p>
          <Card className="p-5">
            <Eyebrow>Sobre la ruta</Eyebrow>
            <p className="mt-2 whitespace-pre-line text-[17px] leading-relaxed">{r.description || 'Todavía no hay una descripción de esta ruta.'}</p>
            <p className="mt-3 text-sm text-muted">Actualizada el {formatDate(r.updated_at)}</p>
          </Card>
        </div>
        <div className="flex flex-col gap-4">
          <PhotoGallery photos={photos} name={r.name} />
          <ServicesCard services={listServices(r.services)} />
          <Card className="p-5 text-[15px] text-muted">
            <p className="font-semibold text-ink">Antes de salir</p>
            <p className="mt-1">Lleva agua, avisa a alguien de tu recorrido y revisa el clima. La duración es aproximada, a paso tranquilo.</p>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}

function Fact({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 rounded-[18px] bg-surface p-3 shadow-[var(--shadow-card)] sm:p-4">
      <dt className="flex items-center gap-1.5 text-[13px] font-semibold text-muted"><span aria-hidden>{icon}</span>{label}</dt>
      <dd className="text-[17px] font-bold">{value}</dd>
    </div>
  );
}
