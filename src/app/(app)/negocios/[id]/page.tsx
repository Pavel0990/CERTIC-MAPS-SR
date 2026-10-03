import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Globe, Mail, MapPin, MessageCircle, Phone, Settings, Tag } from 'lucide-react';
import { getBusinessDetail, isBusinessMember } from '@/modules/businesses/server';
import { formatTime, hoursByDay, isOpenNow } from '@/modules/businesses';
import { listPhotos } from '@/modules/media/server';
import { MapCanvas, type MapFeatureCollection } from '@/modules/map';
import { PageShell } from '@/components/shared/page';
import { TrackView, TrackedLink } from '@/components/shared/engagement';
import { Badge, Card, Eyebrow } from '@/components/ui/primitives';
import { getViewer } from '@/lib/auth';
import { WEEKDAYS } from '@/lib/vocabulary';
import { createClient } from '@/lib/supabase/server';
import { formatDate } from '@/utils/format';
import { DirectionsButton, HeaderActions, InfoRow, RejectedNotice, SecondaryLink, StatusLine, UUID } from '../../_contenido/detail';
import { PhotoGallery } from '../../_contenido/photo-gallery';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  if (!UUID.test(id)) return { title: 'Negocio' };
  const b = await getBusinessDetail(await createClient(), id);
  return { title: b?.name ?? 'Negocio', description: b?.description?.slice(0, 160) ?? undefined };
}

/** wa.me exige el número con código de país y sin símbolos. Un número local de 10 dígitos es de República Dominicana. */
function whatsappUrl(n: string) {
  const digits = n.replace(/\D/g, '');
  return `https://wa.me/${digits.length === 10 ? `1${digits}` : digits}`;
}

export default async function BusinessPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const supabase = await createClient();
  const [b, photos, viewer] = await Promise.all([getBusinessDetail(supabase, id), listPhotos(supabase, 'business_id', id), getViewer()]);
  if (!b) notFound();
  const member = viewer ? await isBusinessMember(supabase, b.id, viewer.id) : false;

  const approved = b.status === 'approved';
  const open = isOpenNow(b.hours);
  const byDay = hoursByDay(b.hours);
  const today = new Date().toLocaleDateString('en-US', { timeZone: 'America/Santo_Domingo', weekday: 'short' });
  const todayIdx = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(today);
  const pin: MapFeatureCollection = {
    type: 'FeatureCollection',
    features: [{ type: 'Feature', geometry: { type: 'Point', coordinates: [b.point.lng, b.point.lat] }, properties: { id: b.id, layer: 'business', title: b.name } }],
  };

  return (
    <PageShell
      back={{ href: '/mapa?capas=business', label: 'Mapa' }}
      eyebrow={`${b.category ?? 'Negocio'}${b.municipality ? ` · ${b.municipality}` : ''}`}
      title={b.name}
      actions={
        <HeaderActions>
          <DirectionsButton entity="business" id={b.id} point={b.point} />
          {member && <SecondaryLink href={`/negocio/${b.id}`} icon={<Settings className="size-4" aria-hidden />}>Administrar</SecondaryLink>}
        </HeaderActions>
      }
      description={
        approved ? (
          b.hours.length > 0 ? <Badge tone={open ? 'ok' : 'neutral'}>{open ? 'Abierto ahora' : 'Cerrado ahora'}</Badge> : undefined
        ) : (
          <StatusLine status={b.status} />
        )
      }
    >
      {approved && <TrackView entity="business" id={b.id} />}
      <div className="grid gap-4 md:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-4">
          {(b.status === 'rejected' || b.status === 'suspended') && <RejectedNotice reason={b.status_reason} />}
          <PhotoGallery photos={photos} name={b.name} />
          {b.promotions.length > 0 && (
            <Card className="p-5">
              <Eyebrow className="mb-3">Promociones</Eyebrow>
              <ul className="flex flex-col gap-3">
                {b.promotions.map((p) => (
                  <li key={p.id} className="flex gap-3 rounded-[14px] bg-ok-soft p-4">
                    <Tag className="mt-0.5 size-5 shrink-0 text-ok" aria-hidden />
                    <div>
                      <p className="font-bold">{p.title}</p>
                      {p.description && <p className="mt-0.5 text-[15px]">{p.description}</p>}
                      <p className="mt-1 text-sm text-muted">Hasta el {formatDate(`${p.valid_until}T12:00:00`)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          <Card className="p-5">
            <Eyebrow>Sobre el negocio</Eyebrow>
            <p className="mt-2 whitespace-pre-line text-[17px] leading-relaxed">{b.description || 'Este negocio todavía no tiene descripción.'}</p>
          </Card>
          {b.hours.length > 0 && (
            <Card className="p-5">
              <Eyebrow className="mb-3">Horario</Eyebrow>
              <dl className="flex flex-col">
                {/* Semana empezando el lunes, como se acostumbra */}
                {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                  <div key={d} className={d === todayIdx ? 'flex justify-between gap-3 rounded-[10px] bg-canvas px-2 py-2 font-semibold' : 'flex justify-between gap-3 px-2 py-2'}>
                    <dt>{WEEKDAYS[d]}{d === todayIdx && <span className="sr-only"> (hoy)</span>}</dt>
                    <dd className="text-right">
                      {byDay[d]?.length ? byDay[d].map((h) => `${formatTime(h.opens)} – ${formatTime(h.closes)}`).join(', ') : <span className="text-muted">Cerrado</span>}
                    </dd>
                  </div>
                ))}
              </dl>
            </Card>
          )}
        </div>
        <div className="flex flex-col gap-4">
          {(b.whatsapp || b.phone || b.email || b.website || b.address) && (
            <Card className="flex flex-col gap-4 p-5">
              {b.whatsapp && (
                <TrackedLink entity="business" id={b.id} metric="whatsapp" href={whatsappUrl(b.whatsapp)} className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-[14px] bg-ok px-5 text-base font-semibold text-white shadow-sm transition-opacity hover:opacity-90">
                  <MessageCircle className="size-5" aria-hidden /> Escribir por WhatsApp
                </TrackedLink>
              )}
              {b.phone && <InfoRow icon={<Phone className="size-5" />} title="Teléfono"><a href={`tel:${b.phone.replace(/[^\d+]/g, '')}`} className="font-semibold text-brand hover:underline">{b.phone}</a></InfoRow>}
              {b.email && <InfoRow icon={<Mail className="size-5" />} title="Correo"><a href={`mailto:${b.email}`} className="break-all font-semibold text-brand hover:underline">{b.email}</a></InfoRow>}
              {b.website && <InfoRow icon={<Globe className="size-5" />} title="Página web"><a href={b.website} target="_blank" rel="noopener noreferrer nofollow" className="break-all font-semibold text-brand hover:underline">{b.website.replace(/^https:\/\//, '')}</a></InfoRow>}
              {b.address && <InfoRow icon={<MapPin className="size-5" />} title="Dirección">{b.address}</InfoRow>}
            </Card>
          )}
          <div className="relative h-[240px] overflow-hidden rounded-[18px] shadow-[var(--shadow-card)]">
            <MapCanvas className="absolute inset-0" features={pin} selectedId={b.id} initialView={{ center: b.point, zoom: 14 }} ariaLabel={`Mapa con la ubicación de ${b.name}`} />
          </div>
        </div>
      </div>
    </PageShell>
  );
}
