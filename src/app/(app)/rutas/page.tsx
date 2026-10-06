import type { Metadata } from 'next';
import Link from 'next/link';
import { Clock, Footprints, Route } from 'lucide-react';
import { listRoutes } from '@/modules/routes/server';
import { PageShell } from '@/components/shared/page';
import { Badge, Card, EmptyState } from '@/components/ui/primitives';
import { getCatalogs } from '@/lib/catalogs';
import { createClient } from '@/lib/supabase/server';
import { DIFFICULTY, ROUTE_KIND } from '@/lib/vocabulary';
import { FilterChips, ListRow, OsmCredit } from '../_contenido/list';

export const metadata: Metadata = { title: 'Rutas', description: 'Rutas para caminar y pedalear en Santiago Rodríguez, con distancia, tiempo y dificultad.' };

const duration = (min: number) => (min < 60 ? `${min} min` : `${Math.floor(min / 60)} h${min % 60 ? ` ${min % 60} min` : ''}`);
const km = (v: number | null) => (v === null ? '' : `${v.toLocaleString('es-DO', { maximumFractionDigits: 1 })} km`);

export default async function RoutesPage({ searchParams }: { searchParams: Promise<{ municipio?: string }> }) {
  const sp = await searchParams;
  const { municipalities } = await getCatalogs();
  const muni = municipalities.find((m) => m.code.toLowerCase() === sp.municipio?.toLowerCase());
  const items = await listRoutes(await createClient(), { municipalityId: muni?.id });

  return (
    <PageShell title="Rutas" eyebrow="Santiago Rodríguez" description="Para caminar o pedalear. De la más corta a la más larga." wide>
      <div className="mb-3">
        <FilterChips label="Municipio" active={muni?.code.toLowerCase() ?? ''} hrefFor={(v) => (v ? `/rutas?municipio=${v}` : '/rutas')}
          options={municipalities.map((m) => ({ value: m.code.toLowerCase(), label: m.name }))} />
      </div>
      <p className="mb-2 text-[15px] text-muted" aria-live="polite">{items.length === 1 ? '1 ruta' : `${items.length} rutas`}</p>
      {items.length === 0 ? (
        <Card><EmptyState icon={<Route className="size-7" />} title="No hay rutas en este municipio" action={<Link href="/rutas" className="font-semibold text-brand underline">Ver todas</Link>} /></Card>
      ) : (
        <Card className="overflow-hidden">
          <ul>
            {items.map((r) => (
              <ListRow
                key={r.id}
                href={`/rutas/${r.id}`}
                icon={<Footprints className="size-6" />}
                iconClass="bg-[#ccfbf1] text-[#0f766e]"
                title={r.name}
                subtitle={[km(r.distance_km), ROUTE_KIND[r.kind], r.municipality].filter(Boolean).join(' · ')}
                badge={
                  <span className="flex flex-wrap items-center gap-2">
                    <Badge tone={DIFFICULTY[r.difficulty]?.tone ?? 'neutral'}>{DIFFICULTY[r.difficulty]?.label ?? r.difficulty}</Badge>
                    <span className="inline-flex items-center gap-1 text-sm text-muted"><Clock className="size-3.5" aria-hidden /> {duration(r.duration_min)} a pie</span>
                  </span>
                }
              />
            ))}
          </ul>
        </Card>
      )}
      <p className="mt-4 text-[15px]">¿Haces una ruta que falta? <Link href="/proponer?que=ruta" className="font-semibold text-brand underline">Propónla</Link> dibujándola en el mapa o con un archivo GPX.</p>
      <OsmCredit />
    </PageShell>
  );
}
