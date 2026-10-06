import type { Metadata } from 'next';
import Link from 'next/link';
import { Phone, Search, Store } from 'lucide-react';
import { listBusinesses } from '@/modules/businesses/server';
import { catalogIcon } from '@/components/shared/catalog-icon';
import { PageShell } from '@/components/shared/page';
import { Badge, Card, EmptyState } from '@/components/ui/primitives';
import { getCatalogs } from '@/lib/catalogs';
import { createClient } from '@/lib/supabase/server';
import { FilterChips, ListRow, OsmCredit } from '../_contenido/list';

export const metadata: Metadata = { title: 'Negocios', description: 'Comercios y servicios de Santiago Rodríguez: colmados, comida, salud, alojamiento y más.' };

type Params = { municipio?: string; tipo?: string; q?: string };

// Listado de negocios para quien prefiere una lista a un mapa (criterio de baja alfabetización digital).
export default async function BusinessesPage({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const catalogs = await getCatalogs();
  const muni = catalogs.municipalities.find((m) => m.code.toLowerCase() === sp.municipio?.toLowerCase());
  const cat = catalogs.businessCategories.find((c) => c.slug === sp.tipo);
  const q = sp.q?.trim().slice(0, 60) ?? '';
  const items = await listBusinesses(await createClient(), { municipalityId: muni?.id, categorySlug: cat?.slug, q });

  const href = (next: Params) => {
    const p = new URLSearchParams();
    const merged = { municipio: muni?.code.toLowerCase(), tipo: cat?.slug, q: q || undefined, ...next };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `/negocios?${s}` : '/negocios';
  };

  return (
    <PageShell title="Negocios" eyebrow="Santiago Rodríguez" description="Colmados, comida, salud, alojamiento y servicios. Toca uno para ver cómo llegar." wide>
      <form action="/negocios" className="mb-4 flex gap-2" role="search">
        {muni && <input type="hidden" name="municipio" value={muni.code.toLowerCase()} />}
        {cat && <input type="hidden" name="tipo" value={cat.slug} />}
        <label htmlFor="buscar-negocio" className="sr-only">Buscar por nombre</label>
        <input id="buscar-negocio" name="q" defaultValue={q} placeholder="Buscar por nombre" className="h-12 min-w-0 flex-1 rounded-[14px] border border-line-strong bg-surface px-4 text-[17px] focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15" />
        <button type="submit" className="inline-flex h-12 items-center gap-2 rounded-[14px] bg-ink px-4 text-[16px] font-semibold text-white">
          <Search className="size-5" aria-hidden /> Buscar
        </button>
      </form>
      <div className="mb-3 flex flex-col gap-2">
        <FilterChips label="Municipio" active={muni?.code.toLowerCase() ?? ''} hrefFor={(v) => href({ municipio: v || undefined })}
          options={catalogs.municipalities.map((m) => ({ value: m.code.toLowerCase(), label: m.name }))} />
        <FilterChips label="Tipo de negocio" active={cat?.slug ?? ''} hrefFor={(v) => href({ tipo: v || undefined })}
          options={catalogs.businessCategories.map((c) => { const I = catalogIcon(c.icon, Store); return { value: c.slug, label: c.name, icon: <I className="size-4" aria-hidden /> }; })} />
      </div>

      <p className="mb-2 text-[15px] text-muted" aria-live="polite">
        {items.length === 0 ? 'Ningún negocio' : items.length === 1 ? '1 negocio' : `${items.length} negocios`}
        {q && <> con «{q}»</>}
      </p>
      {items.length === 0 ? (
        <Card>
          <EmptyState icon={<Store className="size-7" />} title="No encontramos negocios" action={<Link href="/negocios" className="font-semibold text-brand underline">Ver todos</Link>}>
            Prueba con otro nombre o quita los filtros.
          </EmptyState>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <ul>
            {items.map((b) => {
              const Icon = catalogIcon(b.category?.icon, Store);
              return (
                <ListRow
                  key={b.id}
                  href={`/negocios/${b.id}`}
                  icon={<Icon className="size-6" />}
                  title={b.name}
                  subtitle={[b.category?.name, b.municipality].filter(Boolean).join(' · ')}
                  badge={b.openNow === true ? <Badge tone="ok">Abierto ahora</Badge> : b.openNow === false ? <Badge tone="neutral">Cerrado ahora</Badge> : undefined}
                  action={b.phone ? (
                    <a href={`tel:${b.phone.replace(/[^\d+]/g, '')}`} className="inline-flex h-11 items-center gap-1.5 rounded-[12px] border border-line-strong px-3 text-[15px] font-semibold hover:bg-canvas" aria-label={`Llamar a ${b.name}`}>
                      <Phone className="size-4" aria-hidden /> Llamar
                    </a>
                  ) : undefined}
                />
              );
            })}
          </ul>
        </Card>
      )}
      <Card className="mt-4 flex flex-wrap items-center gap-3 p-4">
        <span className="min-w-0 flex-1 text-[15px]"><strong>¿Tienes un negocio?</strong> Regístralo gratis para que aparezca con tu horario, fotos y WhatsApp.</span>
        <Link href="/negocios/registrar" className="inline-flex h-11 items-center rounded-[12px] bg-brand px-4 text-[15px] font-semibold text-white hover:bg-brand-strong">Registrar mi negocio</Link>
      </Card>
      <OsmCredit />
    </PageShell>
  );
}
