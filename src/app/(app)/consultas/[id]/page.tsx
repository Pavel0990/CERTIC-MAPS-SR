import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CircleCheck, MapPin } from 'lucide-react';
import { getMyActivity, getRequestDetail } from '@/modules/citizen-reports/server';
import { listPhotos } from '@/modules/media/server';
import { PageShell } from '@/components/shared/page';
import { RequestStatusBadge, RequestTimeline } from '@/components/shared/status';
import { Card, Eyebrow, Notice } from '@/components/ui/primitives';
import { getViewer } from '@/lib/auth';
import { getLabelMaps } from '@/lib/catalogs';
import { REQUEST_STATUS, type RequestStatus } from '@/lib/vocabulary';
import { createClient } from '@/lib/supabase/server';
import { directionsUrl, formatDate } from '@/utils/format';
import { VoteButton } from './vote-button';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  if (!UUID.test(id)) return { title: 'Reporte' };
  const r = await getRequestDetail(await createClient(), id);
  return { title: r?.title ?? 'Reporte' };
}

export default async function RequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const supabase = await createClient();
  const viewer = await getViewer();
  const [r, labels, activity] = await Promise.all([
    getRequestDetail(supabase, id),
    getLabelMaps(),
    viewer ? getMyActivity(supabase) : Promise.resolve(null),
  ]);
  if (!r) notFound();
  const mine = !!activity?.requests.some((x) => x.id === id);
  const votable = r.is_public && ['approved', 'in_progress'].includes(r.status) && !mine;
  const photos = await listPhotos(supabase, 'citizen_request_id', id);
  const info = REQUEST_STATUS[r.status as RequestStatus];

  return (
    <PageShell
      back={{ href: mine ? '/actividad' : '/actividad?ver=prioridades', label: mine ? 'Mi actividad' : 'Prioridades' }}
      eyebrow={`${labels.categories[r.category] ?? r.category}${r.municipality ? ` · ${r.municipality}` : ''}`}
      title={r.title}
      description={<span className="flex flex-wrap items-center gap-2"><RequestStatusBadge status={r.status} /> {info?.explain}</span>}
    >
      <div className="grid gap-4 md:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-4">
          {r.status === 'resolved' && r.resolution_note && (
            <Notice tone="ok">
              <p className="flex items-center gap-2 font-bold"><CircleCheck className="size-5" aria-hidden /> Respuesta del municipio</p>
              <p className="mt-1 text-ink">{r.resolution_note}</p>
            </Notice>
          )}
          <Card className="p-5">
            <Eyebrow>Lo que se reportó</Eyebrow>
            <p className="mt-2 whitespace-pre-line text-[17px] leading-relaxed">{r.description}</p>
            <p className="mt-3 text-sm text-muted">Enviado el {formatDate(r.created_at)}{mine ? ' · por ti' : ''}</p>
            {photos.length > 0 && (
              <ul className="mt-4 grid grid-cols-3 gap-2">
                {photos.map((p, i) => (
                  <li key={p.id} className="aspect-square overflow-hidden rounded-[12px] bg-canvas">
                    {/* eslint-disable-next-line @next/next/no-img-element -- URL firmada de 5 minutos (§10.5) */}
                    <img src={p.url} alt={`Foto ${i + 1} del reporte`} className="size-full object-cover" loading="lazy" />
                  </li>
                ))}
              </ul>
            )}
          </Card>
          {votable && (
            <Card className="flex flex-col gap-3 p-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-lg font-bold">¿Te afecta a ti también?</p>
                <p className="text-[15px] text-muted">Tu apoyo ayuda al municipio a decidir qué atender primero.</p>
              </div>
              <VoteButton requestId={r.id} initialVoted={!!activity?.votes.includes(r.id)} initialCount={r.support_count} signedIn={!!viewer} />
            </Card>
          )}
          {!votable && r.is_public && r.support_count > 0 && (
            <p className="text-[15px] text-muted">{r.support_count === 1 ? '1 vecino apoya' : `${r.support_count} vecinos apoyan`} este reporte.</p>
          )}
        </div>
        <div className="flex flex-col gap-4">
          <Card className="p-5">
            <Eyebrow className="mb-4">Seguimiento</Eyebrow>
            <RequestTimeline status={r.status} history={r.history} rejectionReason={r.rejection_reason} />
          </Card>
          {r.point && (
            <a href={directionsUrl(r.point.lat, r.point.lng)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-[18px] bg-surface p-4 font-semibold shadow-[var(--shadow-card)] hover:bg-[#fafbfc]">
              <span className="flex size-10 items-center justify-center rounded-full bg-brand-soft text-brand"><MapPin className="size-5" aria-hidden /></span>
              Ver el lugar en el mapa
            </a>
          )}
        </div>
      </div>
    </PageShell>
  );
}
