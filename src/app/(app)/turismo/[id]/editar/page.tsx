import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getPlaceDetail } from '@/modules/tourism/server';
import { PLACE_SERVICES } from '@/modules/tourism';
import { PageShell } from '@/components/shared/page';
import { Card } from '@/components/ui/primitives';
import { requireViewer } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { UUID } from '../../../_contenido/detail';
import { canEditContent } from '../../../_contenido/permissions';
import { PlaceForm } from './place-form';

export const metadata: Metadata = { title: 'Editar lugar' };

export default async function EditPlacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const viewer = await requireViewer(`/turismo/${id}/editar`);
  const p = await getPlaceDetail(await createClient(), id);
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
    </PageShell>
  );
}
