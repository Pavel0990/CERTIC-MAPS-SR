import type { Metadata } from 'next';
import { ClipboardCheck } from 'lucide-react';
import { listValidationQueue } from '@/modules/admin/server';
import { ContentStatusBadge } from '@/components/shared/status';
import { Card, EmptyState, Eyebrow } from '@/components/ui/primitives';
import { requireStaff } from '@/lib/auth';
import { getCatalogs } from '@/lib/catalogs';
import { createClient } from '@/lib/supabase/server';
import { PLACE_KIND, ROUTE_KIND, DIFFICULTY } from '@/lib/vocabulary';
import { formatDate, formatMinutes, timeAgo } from '@/utils/format';
import { ReviewActions } from './review-actions';

export const metadata: Metadata = { title: 'Validaciones' };

export default async function ValidationsPage() {
  await requireStaff('/admin/validaciones');
  const supabase = await createClient();
  const [queue, catalogs] = await Promise.all([listValidationQueue(supabase), getCatalogs()]);
  const muni = new Map(catalogs.municipalities.map((m) => [m.id, m.name]));
  const category = new Map(catalogs.businessCategories.map((c) => [c.id, c.name]));
  const total = queue.businesses.length + queue.places.length + queue.routes.length + queue.promotions.length + queue.photos.length;

  return (
    <>
      <header className="mb-5">
        <Eyebrow>Gestión municipal</Eyebrow>
        <h1 className="text-[28px] font-extrabold md:text-[34px]">Validaciones</h1>
        <p className="mt-1 text-[16px] text-muted">Lo que envían vecinos y comercios no aparece en el mapa hasta que lo apruebas.</p>
      </header>

      {total === 0 && (
        <Card><EmptyState icon={<ClipboardCheck className="size-7" />} title="Todo al día">No hay negocios, lugares, rutas, promociones ni fotos esperando revisión.</EmptyState></Card>
      )}

      <Section title="Negocios" count={queue.businesses.length}>
        {queue.businesses.map((b) => (
          <Item key={b.id} title={b.name} status={b.status} meta={`${category.get(b.category_id) ?? 'Negocio'} · ${muni.get(b.municipality_id) ?? ''} · ${timeAgo(b.created_at)}`} body={b.description}>
            <p className="text-sm text-muted">{b.phone ? `Teléfono: ${b.phone}. ` : ''}Verifica por llamada o visita antes de aprobar.</p>
            <ReviewActions entity="business" id={b.id} status={b.status} />
          </Item>
        ))}
      </Section>

      <Section title="Lugares propuestos" count={queue.places.length}>
        {queue.places.map((p) => (
          <Item key={p.id} title={p.name} status={p.status} meta={`${PLACE_KIND[p.kind] ?? p.kind} · ${muni.get(p.municipality_id) ?? ''} · ${timeAgo(p.created_at)}`} body={p.description}>
            <ReviewActions entity="place" id={p.id} status={p.status} />
          </Item>
        ))}
      </Section>

      <Section title="Rutas propuestas" count={queue.routes.length}>
        {queue.routes.map((r) => (
          <Item
            key={r.id}
            title={r.name}
            status={r.status}
            meta={[ROUTE_KIND[r.kind] ?? r.kind, DIFFICULTY[r.difficulty]?.label, formatMinutes(r.duration_min), r.distance_km ? `${Number(r.distance_km).toFixed(1).replace('.', ',')} km` : null, muni.get(r.municipality_id)].filter(Boolean).join(' · ')}
            body={r.description}
          >
            <ReviewActions entity="route" id={r.id} status={r.status} />
          </Item>
        ))}
      </Section>

      <Section title="Promociones" count={queue.promotions.length}>
        {queue.promotions.map((p) => (
          <Item key={p.id} title={p.title} status={p.status} meta={`Del ${formatDate(p.valid_from + 'T12:00:00')} al ${formatDate(p.valid_until + 'T12:00:00')}`} body={p.description}>
            <ReviewActions entity="promotion" id={p.id} status={p.status} />
          </Item>
        ))}
      </Section>

      <Section title="Fotos" count={queue.photos.length}>
        {queue.photos.map((ph) => (
          <article key={ph.id} className="overflow-hidden rounded-[18px] bg-surface shadow-[var(--shadow-card)]">
            {ph.url ? (
              // eslint-disable-next-line @next/next/no-img-element -- URL firmada de 5 minutos (§10.5)
              <img src={ph.url} alt="Foto por revisar" className="aspect-[4/3] w-full object-cover" loading="lazy" />
            ) : (
              <div className="aspect-[4/3] w-full bg-canvas" />
            )}
            <div className="p-3">
              <p className="mb-2 text-sm text-muted">{ph.business_id ? 'Negocio' : ph.tourism_place_id ? 'Lugar turístico' : ph.eco_route_id ? 'Ruta' : 'Evidencia de un reporte (no se publica)'} · {timeAgo(ph.created_at)}</p>
              <ReviewActions entity="attachment" id={ph.id} status={ph.status} publishable={!!(ph.business_id || ph.tourism_place_id || ph.eco_route_id)} />
            </div>
          </article>
        ))}
      </Section>
    </>
  );
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  if (count === 0) return null;
  return (
    <section className="mb-6">
      <h2 className="mb-3 text-lg font-bold">{title} <span className="text-muted">({count})</span></h2>
      <div className="grid gap-3 md:grid-cols-2">{children}</div>
    </section>
  );
}

function Item({ title, status, meta, body, children }: { title: string; status: string; meta: string; body?: string | null; children: React.ReactNode }) {
  return (
    <article className="flex flex-col gap-2 rounded-[18px] bg-surface p-4 shadow-[var(--shadow-card)]">
      <div className="flex flex-wrap items-center gap-2"><ContentStatusBadge status={status} /><span className="text-sm text-muted">{meta}</span></div>
      <h3 className="text-[17px] font-bold">{title}</h3>
      {body && <p className="line-clamp-3 text-[15px] text-muted">{body}</p>}
      {children}
    </article>
  );
}
