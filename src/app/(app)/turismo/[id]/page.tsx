import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Accessibility, Clock } from 'lucide-react';
import { getPlaceDetail } from '@/modules/tourism/server';
import { listServices } from '@/modules/tourism';
import { listPhotos } from '@/modules/media/server';
import { MapCanvas, type MapFeatureCollection } from '@/modules/map';
import { PageShell } from '@/components/shared/page';
import { TrackView } from '@/components/shared/engagement';
import { Card, Eyebrow } from '@/components/ui/primitives';
import { getViewer } from '@/lib/auth';
import { PLACE_KIND } from '@/lib/vocabulary';
import { createClient } from '@/lib/supabase/server';
import { formatDate } from '@/utils/format';
import { DirectionsButton, HeaderActions, InfoRow, RejectedNotice, SecondaryLink, ServicesCard, StatusLine, UUID } from '../../_contenido/detail';
import { PhotoGallery } from '../../_contenido/photo-gallery';
import { canEditContent } from '../../_contenido/permissions';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  if (!UUID.test(id)) return { title: 'Lugar turístico' };
  const p = await getPlaceDetail(await createClient(), id);
  return { title: p?.name ?? 'Lugar turístico', description: p?.description?.slice(0, 160) ?? undefined };
}

export default async function TourismPlacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const supabase = await createClient();
  const [p, photos, viewer] = await Promise.all([getPlaceDetail(supabase, id), listPhotos(supabase, 'tourism_place_id', id), getViewer()]);
  if (!p) notFound();

  const published = p.status === 'published';
  const pin: MapFeatureCollection = {
    type: 'FeatureCollection',
    features: [{ type: 'Feature', geometry: { type: 'Point', coordinates: [p.point.lng, p.point.lat] }, properties: { id: p.id, layer: 'tourism', title: p.name } }],
  };

  return (
    <PageShell
      back={{ href: '/mapa?capas=tourism', label: 'Mapa' }}
      eyebrow={`${PLACE_KIND[p.kind] ?? 'Turismo'}${p.municipality ? ` · ${p.municipality}` : ''}`}
      title={p.name}
      actions={
        <HeaderActions>
          <DirectionsButton entity="tourism_place" id={p.id} point={p.point} />
          {canEditContent(viewer, p.municipality_id, p.status) && <SecondaryLink href={`/turismo/${p.id}/editar`}>Editar</SecondaryLink>}
        </HeaderActions>
      }
      description={published ? undefined : <StatusLine status={p.status} />}
    >
      {published && <TrackView entity="tourism_place" id={p.id} />}
      <div className="grid gap-4 md:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-4">
          {p.status === 'rejected' && <RejectedNotice reason={p.status_reason} />}
          <PhotoGallery photos={photos} name={p.name} />
          <Card className="p-5">
            <Eyebrow>Sobre el lugar</Eyebrow>
            <p className="mt-2 whitespace-pre-line text-[17px] leading-relaxed">{p.description || 'Todavía no hay una descripción de este lugar.'}</p>
            <p className="mt-3 text-sm text-muted">Actualizado el {formatDate(p.updated_at)}</p>
          </Card>
          <ServicesCard services={listServices(p.services)} />
        </div>
        <div className="flex flex-col gap-4">
          <div className="relative h-[240px] overflow-hidden rounded-[18px] shadow-[var(--shadow-card)]">
            <MapCanvas className="absolute inset-0" features={pin} selectedId={p.id} initialView={{ center: p.point, zoom: 12 }} ariaLabel={`Mapa con la ubicación de ${p.name}`} />
          </div>
          {(p.opening_info || p.accessibility) && (
            <Card className="flex flex-col gap-4 p-5">
              {p.opening_info && <InfoRow icon={<Clock className="size-5" />} title="Horario">{p.opening_info}</InfoRow>}
              {p.accessibility && <InfoRow icon={<Accessibility className="size-5" />} title="Acceso">{p.accessibility}</InfoRow>}
            </Card>
          )}
        </div>
      </div>
    </PageShell>
  );
}
