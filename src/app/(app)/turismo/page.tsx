import type { Metadata } from 'next';
import Link from 'next/link';
import { Church, Landmark, Mountain, Palmtree, Sprout, Trees, Waves, type LucideIcon } from 'lucide-react';
import { listPlaces } from '@/modules/tourism/server';
import { PageShell } from '@/components/shared/page';
import { Card, EmptyState } from '@/components/ui/primitives';
import { getCatalogs } from '@/lib/catalogs';
import { createClient } from '@/lib/supabase/server';
import { PLACE_KIND } from '@/lib/vocabulary';
import { FilterChips, ListRow, OsmCredit } from '../_contenido/list';

export const metadata: Metadata = { title: 'Lugares para visitar', description: 'Presas, parques, miradores y áreas protegidas de Santiago Rodríguez.' };

const KIND_ICON: Record<string, LucideIcon> = { mirador: Mountain, rio_balneario: Waves, cultural: Church, historico: Landmark, agroturismo: Sprout, naturaleza: Trees };

export default async function PlacesPage({ searchParams }: { searchParams: Promise<{ municipio?: string; tipo?: string }> }) {
  const sp = await searchParams;
  const { municipalities } = await getCatalogs();
  const muni = municipalities.find((m) => m.code.toLowerCase() === sp.municipio?.toLowerCase());
  const kind = sp.tipo && PLACE_KIND[sp.tipo] ? sp.tipo : '';
  const items = await listPlaces(await createClient(), { municipalityId: muni?.id, kind: kind || undefined });
  const href = (next: { municipio?: string; tipo?: string }) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ municipio: muni?.code.toLowerCase(), tipo: kind || undefined, ...next })) if (v) p.set(k, v);
    return p.size ? `/turismo?${p}` : '/turismo';
  };
  const kinds = Object.entries(PLACE_KIND).filter(([k]) => k !== 'otro');

  return (
    <PageShell title="Lugares para visitar" eyebrow="Santiago Rodríguez" description="Presas, parques, miradores y áreas protegidas. Toca uno para ver cómo llegar." wide>
      <div className="mb-3 flex flex-col gap-2">
        <FilterChips label="Municipio" active={muni?.code.toLowerCase() ?? ''} hrefFor={(v) => href({ municipio: v || undefined })}
          options={municipalities.map((m) => ({ value: m.code.toLowerCase(), label: m.name }))} />
        <FilterChips label="Tipo de lugar" active={kind} hrefFor={(v) => href({ tipo: v || undefined })}
          options={kinds.map(([k, label]) => { const I = KIND_ICON[k] ?? Palmtree; return { value: k, label, icon: <I className="size-4" aria-hidden /> }; })} />
      </div>
      <p className="mb-2 text-[15px] text-muted" aria-live="polite">{items.length === 1 ? '1 lugar' : `${items.length} lugares`}</p>
      {items.length === 0 ? (
        <Card><EmptyState icon={<Palmtree className="size-7" />} title="No hay lugares con estos filtros" action={<Link href="/turismo" className="font-semibold text-brand underline">Ver todos</Link>} /></Card>
      ) : (
        <Card className="overflow-hidden">
          <ul>
            {items.map((p) => {
              const Icon = KIND_ICON[p.kind] ?? Palmtree;
              return <ListRow key={p.id} href={`/turismo/${p.id}`} icon={<Icon className="size-6" />} iconClass="bg-ok-soft text-ok" title={p.name} subtitle={[PLACE_KIND[p.kind], p.municipality].filter(Boolean).join(' · ')} />;
            })}
          </ul>
        </Card>
      )}
      <p className="mt-4 text-[15px]">¿Conoces un lugar que falta? <Link href="/proponer" className="font-semibold text-brand underline">Propónlo</Link> y el municipio lo revisa.</p>
      <OsmCredit />
    </PageShell>
  );
}
