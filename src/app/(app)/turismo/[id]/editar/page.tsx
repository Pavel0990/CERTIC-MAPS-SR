import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getPlaceDetail } from '@/modules/tourism/server';
import { PLACE_SERVICES } from '@/modules/tourism';
import { PageShell } from '@/components/shared/page';
import { Card } from '@/components/ui/primitives';
import { requireViewer } from '@/lib/auth';
import { listPhotos } from '@/modules/media/server';
import { createClient } from '@/lib/supabase/server';
import { AddPhotos } from '../../../_content/add-photos';
import { PhotoGallery } from '../../../_content/photo-gallery';
import { UUID } from '../../../_content/detail';
import { canEditContent } from '../../../_content/permissions';
import { PlaceForm } from './place-form';

export const metadata: Metadata = { title: 'Editar lugar' };

export default async function EditPlacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const viewer = await requireViewer(`/turismo/${id}/editar`);
  const supabase = await createClient();
  const [p, photos] = await Promise.all([getPlaceDetail(supabase, id), listPhotos(supabase, 'tourism_place_id', id)]);
  if (!p) notFound();
  if (!canEditContent(viewer, p.municipality_id, p.status)) redirect('/sin-permiso');

  // Servicios conocidos más los que ya tenga el lugar (para no perderlos al guardar)
  const services: Record<string, boolean> = Object.fromEntries(Object.keys(PLACE_SERVICES).map((k) => [k, false]));
  for (const [k, val] of Object.entries(p.services)) if (typeof val === 'boolean') services[k] = val;

  return (
    <PageShell back={{ href: `/turismo/${p.id}`, label: p.name }} eyebrow="Editar lugar" title={p.name}>
      <Card className="p-5">
        <PlaceForm
          initial={{
            id: p.id, version: p.version, name: p.name, kind: p.kind, description: p.description ?? '',
            accessibility: p.accessibility ?? '', opening_info: p.opening_info ?? '', services,
          }}
        />
      </Card>
      {/* Fotos: las que ya tiene la ficha y el selector para subir más */}
      <Card className="mt-4 p-5">
        <h2 className="text-lg font-bold">Fotos</h2>
        <p className="mt-1 text-[15px] text-muted">Salen en la ficha y en la portada cuando un moderador las aprueba en Validaciones.</p>
        {photos.length > 0 && <div className="mt-4"><PhotoGallery photos={photos} name={p.name} /></div>}
        <div className="mt-4"><AddPhotos entity="tourism_place" id={p.id} room={10 - photos.length} hint="El lugar de frente, el paisaje y la entrada o cómo se llega." /></div>
      </Card>
    </PageShell>
  );
}
