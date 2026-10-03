import Link from 'next/link';
import type { ReactNode } from 'react';
import { Check, Navigation, Pencil, X } from 'lucide-react';
import { TrackedLink } from '@/components/shared/engagement';
import { Badge, Card, Eyebrow, Notice } from '@/components/ui/primitives';
import { CONTENT_STATUS, type ContentStatus } from '@/lib/vocabulary';
import { directionsUrl } from '@/utils/format';

type Entity = 'business' | 'tourism_place' | 'eco_route';

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const primaryLink =
  'inline-flex min-h-[52px] w-full select-none items-center justify-center gap-2.5 rounded-[14px] bg-brand px-5 text-base font-semibold text-white shadow-sm transition-colors hover:bg-brand-strong sm:w-auto';
const secondaryLink =
  'inline-flex min-h-[52px] w-full select-none items-center justify-center gap-2 rounded-[14px] border border-line-strong bg-surface px-5 text-base font-semibold text-ink transition-colors hover:bg-canvas sm:w-auto';

/** Botón "Cómo llegar" de las fichas: abre Google Maps y cuenta el clic (§7.3, §9.3). */
export function DirectionsButton({ entity, id, point, label = 'Cómo llegar' }: { entity: Entity; id: string; point: { lat: number; lng: number }; label?: string }) {
  return (
    <TrackedLink entity={entity} id={id} metric="directions" href={directionsUrl(point.lat, point.lng)} className={primaryLink}>
      <Navigation className="size-5" aria-hidden /> {label}
    </TrackedLink>
  );
}

export function SecondaryLink({ href, children, icon = <Pencil className="size-4" aria-hidden /> }: { href: string; children: ReactNode; icon?: ReactNode }) {
  return <Link href={href} className={secondaryLink}>{icon}{children}</Link>;
}

/** Acciones del encabezado de una ficha, apiladas en el móvil. */
export function HeaderActions({ children }: { children: ReactNode }) {
  return <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">{children}</div>;
}

/** Estado de revisión (solo cuando no está publicado: lo ven quien lo propuso y el personal). */
export function StatusLine({ status }: { status: string }) {
  const info = CONTENT_STATUS[status as ContentStatus];
  if (!info) return null;
  return <span className="flex flex-wrap items-center gap-2"><Badge tone={info.tone}>{info.label}</Badge> {info.explain}</span>;
}

export function RejectedNotice({ reason }: { reason: string | null }) {
  if (!reason) return null;
  return (
    <Notice tone="danger">
      <p className="font-bold">Motivo</p>
      <p className="mt-1 text-ink">{reason}</p>
    </Notice>
  );
}

/** Lista de servicios disponibles y no disponibles. */
export function ServicesCard({ services }: { services: { key: string; label: string; available: boolean }[] }) {
  if (!services.length) return null;
  return (
    <Card className="p-5">
      <Eyebrow className="mb-3">Servicios</Eyebrow>
      <ul className="grid grid-cols-2 gap-2">
        {services.map((s) => (
          <li key={s.key} className={s.available ? 'flex items-center gap-2 text-[16px]' : 'flex items-center gap-2 text-[16px] text-muted'}>
            {s.available ? <Check className="size-5 text-ok" aria-hidden /> : <X className="size-5" aria-hidden />}
            {s.label}
            <span className="sr-only">{s.available ? ': sí hay' : ': no hay'}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/** Fila de dato con ícono (horario, acceso, teléfono…). */
export function InfoRow({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 shrink-0 text-muted" aria-hidden>{icon}</span>
      <div className="min-w-0"><p className="font-semibold">{title}</p><div className="text-[15px] text-muted">{children}</div></div>
    </div>
  );
}
