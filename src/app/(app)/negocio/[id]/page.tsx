import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { Eye, MessageCircle, Navigation } from 'lucide-react';
import { getBusinessDetail, getBusinessStats, isBusinessMember, listPromotions } from '@/modules/businesses/server';
import { listPhotos } from '@/modules/media/server';
import { PageShell } from '@/components/shared/page';
import { Badge, Card, Eyebrow, Notice } from '@/components/ui/primitives';
import { requireViewer } from '@/lib/auth';
import { CONTENT_STATUS, type ContentStatus } from '@/lib/vocabulary';
import { createClient } from '@/lib/supabase/server';
import { formatDate, formatNumber } from '@/utils/format';
import { HeaderActions, RejectedNotice, SecondaryLink, StatusLine, UUID } from '../../_contenido/detail';
import { PhotoGallery } from '../../_contenido/photo-gallery';
import { isStaffOf } from '../../_contenido/permissions';
import { AddPhotos, BusinessForm, HoursEditor, PromotionForm } from './owner-forms';

export const metadata: Metadata = { title: 'Mi negocio' };

const day = (d: string) => formatDate(`${d}T12:00:00`);

export default async function OwnerBusinessPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const viewer = await requireViewer(`/negocio/${id}`);
  const supabase = await createClient();
  const b = await getBusinessDetail(supabase, id);
  if (!b) notFound();
  const member = await isBusinessMember(supabase, id, viewer.id);
  if (!member && !isStaffOf(viewer, b.municipality_id)) redirect('/sin-permiso');

  const [promotions, stats, photos] = await Promise.all([listPromotions(supabase, id), getBusinessStats(supabase, id), listPhotos(supabase, 'business_id', id)]);
  const approved = b.status === 'approved';
  const editable = !['rejected', 'archived'].includes(b.status);

  return (
    <PageShell
      wide
      back={{ href: '/negocio', label: 'Mis negocios' }}
      eyebrow={b.category ?? 'Negocio'}
      title={b.name}
      description={<StatusLine status={b.status} />}
      actions={<HeaderActions><SecondaryLink href={`/negocios/${b.id}`} icon={<Eye className="size-4" aria-hidden />}>Ver como cliente</SecondaryLink></HeaderActions>}
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-4">
          {(b.status === 'rejected' || b.status === 'suspended') && <RejectedNotice reason={b.status_reason} />}
          {(b.status === 'pending' || b.status === 'under_review') && (
            <Notice>Un moderador está revisando tu negocio. Mientras tanto, completa el horario y las fotos: así sale listo el día que lo aprueben.</Notice>
          )}
          <Card className="p-5">
            <h2 className="mb-4 text-lg font-bold">Datos del negocio</h2>
            {editable ? (
              <BusinessForm
                key={b.version}
                initial={{
                  id: b.id, version: b.version, name: b.name, description: b.description ?? '', phone: b.phone ?? '',
                  whatsapp: b.whatsapp ?? '', email: b.email ?? '', website: b.website ?? '', address: b.address ?? '',
                }}
              />
            ) : (
              <p className="text-[15px] text-muted">Este negocio ya no se puede editar.</p>
            )}
          </Card>
          <Card className="p-5">
            <h2 className="mb-1 text-lg font-bold">Horario</h2>
            <HoursEditor key={JSON.stringify(b.hours)} businessId={b.id} initial={b.hours} />
          </Card>
          <Card className="p-5">
            <h2 className="mb-4 text-lg font-bold">Fotos</h2>
            <div className="flex flex-col gap-4">
              <PhotoGallery photos={photos} name={b.name} />
              <AddPhotos businessId={b.id} room={10 - photos.length} />
            </div>
          </Card>
        </div>
        <div className="flex flex-col gap-4">
          <Card className="p-5">
            <Eyebrow className="mb-3">Últimos {stats.days} días</Eyebrow>
            {approved ? (
              <dl className="grid grid-cols-3 gap-2 text-center">
                <Stat icon={<Eye className="size-5" />} label="Vieron tu ficha" value={stats.view} />
                <Stat icon={<Navigation className="size-5" />} label="Pidieron cómo llegar" value={stats.directions} />
                <Stat icon={<MessageCircle className="size-5" />} label="Te escribieron" value={stats.whatsapp} />
              </dl>
            ) : (
              <p className="text-[15px] text-muted">Verás cuántas personas visitan tu ficha cuando el negocio esté publicado.</p>
            )}
          </Card>
          <Card className="p-5">
            <h2 className="mb-4 text-lg font-bold">Promociones</h2>
            <PromotionForm businessId={b.id} approved={approved} />
            {promotions.length > 0 && (
              <ul className="mt-5 flex flex-col gap-2 border-t border-line pt-4">
                {promotions.map((p) => {
                  const s = CONTENT_STATUS[p.status as ContentStatus];
                  return (
                    <li key={p.id} className="flex items-start justify-between gap-3 rounded-[12px] bg-canvas p-3">
                      <div className="min-w-0">
                        <p className="font-semibold">{p.title}</p>
                        <p className="text-sm text-muted">{day(p.valid_from)} – {day(p.valid_until)}</p>
                      </div>
                      {s && <Badge tone={s.tone}>{s.label}</Badge>}
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </PageShell>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-[14px] bg-canvas p-3">
      <span className="text-muted" aria-hidden>{icon}</span>
      <dt className="order-last text-[13px] leading-tight text-muted">{label}</dt>
      <dd className="text-2xl font-extrabold">{formatNumber(value)}</dd>
    </div>
  );
}
