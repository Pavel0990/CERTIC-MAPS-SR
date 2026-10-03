import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getRouteDetail } from '@/modules/routes/server';
import { PLACE_SERVICES } from '@/modules/tourism';
import { PageShell } from '@/components/shared/page';
import { Card } from '@/components/ui/primitives';
import { requireViewer } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { UUID } from '../../../_contenido/detail';
import { canEditContent } from '../../../_contenido/permissions';
import { RouteForm } from './route-form';

export const metadata: Metadata = { title: 'Editar ruta' };

export default async function EditRoutePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const viewer = await requireViewer(`/rutas/${id}/editar`);
  const r = await getRouteDetail(await createClient(), id);
  if (!r) notFound();
  if (!canEditContent(viewer, r.municipality_id, r.status)) redirect('/sin-permiso');

  const services: Record<string, boolean> = Object.fromEntries(Object.keys(PLACE_SERVICES).map((k) => [k, false]));
  for (const [k, val] of Object.entries(r.services)) if (typeof val === 'boolean') services[k] = val;

  return (
    <PageShell back={{ href: `/rutas/${r.id}`, label: r.name }} eyebrow="Editar ruta" title={r.name}>
      <Card className="p-5">
        <p className="mb-5 text-[15px] text-muted">Para cambiar el trazado, propón una ruta nueva o pídeselo al municipio.</p>
        <RouteForm
          initial={{
            id: r.id, version: r.version, name: r.name, kind: r.kind, difficulty: r.difficulty,
            duration_min: r.duration_min, description: r.description ?? '', services,
          }}
        />
      </Card>
    </PageShell>
  );
}
