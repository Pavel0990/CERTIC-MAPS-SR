import type { Metadata } from 'next';
import Link from 'next/link';
import { Inbox } from 'lucide-react';
import { listRequestInbox, listTrafficInbox, scopeMunicipalities, staffDirectory } from '@/modules/admin/server';
import { LinkTabs } from '@/components/shared/page';
import { Card, EmptyState, Eyebrow } from '@/components/ui/primitives';
import { requireStaff } from '@/lib/auth';
import { getCatalogs, getLabelMaps } from '@/lib/catalogs';
import { createClient } from '@/lib/supabase/server';
import { REQUEST_STATUS, TRAFFIC_STATUS } from '@/lib/vocabulary';
import { cn } from '@/utils/cn';
import { AutoRefresh } from '../_components/auto-refresh';
import { RequestCard, TrafficCard } from './cards';

export const metadata: Metadata = { title: 'Bandeja' };

export default async function InboxPage({ searchParams }: { searchParams: Promise<{ ver?: string; municipio?: string; estado?: string }> }) {
  const viewer = await requireStaff('/admin/bandeja');
  const sp = await searchParams;
  const tab = sp.ver === 'consultas' ? 'consultas' : 'transito';
  const supabase = await createClient();
  const [catalogs, labels] = await Promise.all([getCatalogs(), getLabelMaps()]);
  const scope = scopeMunicipalities(catalogs.municipalities, viewer.roles);
  const muniName = new Map(catalogs.municipalities.map((m) => [m.id, m.name]));
  const muniFilter = scope.some((m) => m.id === sp.municipio) ? sp.municipio : undefined;
  const statusFilter = sp.estado && (tab === 'transito' ? sp.estado in TRAFFIC_STATUS : sp.estado in REQUEST_STATUS) ? sp.estado : undefined;
  const qs = (extra: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { ver: tab === 'consultas' ? 'consultas' : undefined, municipio: muniFilter, estado: statusFilter, ...extra };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    const s = p.toString();
    return `/admin/bandeja${s ? `?${s}` : ''}`;
  };

  const [traffic, requests] = await Promise.all([
    tab === 'transito' ? listTrafficInbox(supabase, { status: statusFilter, municipalityId: muniFilter }) : Promise.resolve([]),
    tab === 'consultas' ? listRequestInbox(supabase, { status: statusFilter, municipalityId: muniFilter }) : Promise.resolve([]),
  ]);
  // Personal asignable por municipio (solo los que aparecen en la lista)
  const munisInList = [...new Set(requests.map((r) => r.municipality_id))];
  const staffByMuni = new Map(await Promise.all(munisInList.map(async (m) => [m, await staffDirectory(supabase, m)] as const)));
  const incidentCategories = catalogs.requestCategories.filter((c) => c.kind === 'incident');

  const statusOptions = tab === 'transito'
    ? (['pending', 'active', 'verified', 'out_of_area', 'resolved', 'rejected', 'expired'] as const).map((s) => [s, TRAFFIC_STATUS[s].label] as const)
    : (['pending', 'under_review', 'approved', 'in_progress', 'resolved', 'rejected', 'archived'] as const).map((s) => [s, REQUEST_STATUS[s].label] as const);

  return (
    <>
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <Eyebrow>Gestión municipal</Eyebrow>
          <h1 className="text-[28px] font-extrabold md:text-[34px]">Bandeja</h1>
        </div>
        <AutoRefresh />
      </header>
      <LinkTabs active={tab === 'transito' ? '/admin/bandeja' : '/admin/bandeja?ver=consultas'} tabs={[{ href: '/admin/bandeja', label: 'Tránsito' }, { href: '/admin/bandeja?ver=consultas', label: 'Reportes al municipio' }]} />

      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filtros">
        {scope.length > 1 && (
          <FilterGroup label="Municipio">
            <Chip href={qs({ municipio: undefined })} active={!muniFilter}>Todos</Chip>
            {scope.map((m) => <Chip key={m.id} href={qs({ municipio: m.id })} active={muniFilter === m.id}>{m.name.replace('San Ignacio de ', '').replace('Villa ', '')}</Chip>)}
          </FilterGroup>
        )}
        <FilterGroup label="Estado">
          <Chip href={qs({ estado: undefined })} active={!statusFilter}>Por atender</Chip>
          {statusOptions.map(([s, label]) => <Chip key={s} href={qs({ estado: s })} active={statusFilter === s}>{label}</Chip>)}
        </FilterGroup>
      </div>

      {tab === 'transito' ? (
        traffic.length === 0 ? (
          <Card><EmptyState icon={<Inbox className="size-7" />} title="Nada pendiente">No hay alertas de tránsito con este filtro.</EmptyState></Card>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {traffic.map((t) => (
              <TrafficCard key={t.id} t={t} typeName={labels.trafficTypes[t.type] ?? t.type} municipality={t.municipality_id ? muniName.get(t.municipality_id) ?? '' : 'Fuera de la provincia'} incidentCategories={incidentCategories} />
            ))}
          </div>
        )
      ) : requests.length === 0 ? (
        <Card><EmptyState icon={<Inbox className="size-7" />} title="Nada pendiente">No hay reportes al municipio con este filtro.</EmptyState></Card>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {requests.map((r) => (
            <RequestCard
              key={r.id}
              r={r}
              categoryName={labels.categories[r.category] ?? r.category}
              municipality={muniName.get(r.municipality_id) ?? ''}
              staff={staffByMuni.get(r.municipality_id) ?? []}
              viewerId={viewer.id}
              canArchive={viewer.isAdmin}
            />
          ))}
        </div>
      )}
      <p className="mt-6 text-sm text-muted">
        Ordenado por gravedad y antigüedad (tránsito) o por apoyos de los vecinos (reportes). <Link href="/admin" className="font-semibold text-brand hover:underline">Ver resumen</Link>
      </p>
    </>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="mr-1 text-sm font-semibold text-muted">{label}:</span>
      {children}
    </div>
  );
}

function Chip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} aria-current={active ? 'true' : undefined} className={cn('rounded-full px-3 py-1.5 text-sm font-semibold transition', active ? 'bg-ink text-white' : 'bg-surface text-muted shadow-[var(--shadow-card)] hover:text-ink')}>
      {children}
    </Link>
  );
}
