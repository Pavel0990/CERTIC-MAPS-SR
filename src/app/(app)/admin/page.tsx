import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, ThumbsUp } from 'lucide-react';
import { getKpis, scopeMunicipalities, type Kpis } from '@/modules/admin/server';
import { Card, Eyebrow, Notice } from '@/components/ui/primitives';
import { requireStaff } from '@/lib/auth';
import { getCatalogs, getLabelMaps } from '@/lib/catalogs';
import { createClient } from '@/lib/supabase/server';
import { cn } from '@/utils/cn';
import { formatDate, formatNumber } from '@/utils/format';

export const metadata: Metadata = { title: 'Panel municipal' };

/** Fechas locales de República Dominicana (los KPIs se calculan en America/Santo_Domingo). */
function lastDays(n: number) {
  const fmt = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santo_Domingo' }).format(d);
  const to = new Date();
  const from = new Date(to.getTime() - (n - 1) * 86_400_000);
  return { from: fmt(from), to: fmt(to) };
}

export default async function AdminHome({ searchParams }: { searchParams: Promise<{ municipio?: string }> }) {
  const viewer = await requireStaff('/admin');
  const { municipio } = await searchParams;
  const [catalogs, labels] = await Promise.all([getCatalogs(), getLabelMaps()]);
  const scope = scopeMunicipalities(catalogs.municipalities, viewer.roles);
  const selected = scope.find((m) => m.id === municipio) ?? null;
  const muniId = viewer.isProvincialAdmin ? selected?.id ?? null : selected?.id ?? scope[0]?.id ?? null;
  const period = lastDays(7);

  const title = muniId ? scope.find((m) => m.id === muniId)?.name ?? 'Territorio' : 'Provincia Santiago Rodríguez';
  const supabase = await createClient();

  if (!viewer.isAdmin) {
    // Moderación: sin KPIs (solo administración, §9.6); se muestra el trabajo pendiente
    const [t, r] = await Promise.all([
      supabase.from('traffic_reports').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('citizen_requests').select('id', { count: 'exact', head: true }).in('status', ['pending', 'under_review']),
    ]);
    return (
      <>
        <Header title="Tu trabajo hoy" subtitle={scope.map((m) => m.name).join(' · ')} />
        <div className="grid gap-4 sm:grid-cols-2">
          <BigLink href="/admin/bandeja" label="Alertas de tránsito por confirmar" value={t.count ?? 0} tone="danger" />
          <BigLink href="/admin/bandeja?ver=consultas" label="Reportes de vecinos por revisar" value={r.count ?? 0} tone="brand" />
        </div>
      </>
    );
  }

  const k = await getKpis(supabase, period.from, period.to, muniId);
  if ('status' in k) return <Notice tone="danger">No pudimos cargar los indicadores. Inténtalo otra vez.</Notice>;

  return (
    <>
      <Header title={title} subtitle={`Últimos 7 días · ${formatDate(period.from + 'T12:00:00')} al ${formatDate(period.to + 'T12:00:00')}`}>
        {(viewer.isProvincialAdmin || scope.length > 1) && (
          <nav aria-label="Municipio" className="flex flex-wrap gap-1 rounded-[14px] bg-[#e9ebee] p-1">
            {viewer.isProvincialAdmin && <ScopeLink href="/admin" active={!muniId} label="Toda la provincia" />}
            {scope.map((m) => <ScopeLink key={m.id} href={`/admin?municipio=${m.id}`} active={muniId === m.id} label={m.name.replace('San Ignacio de ', '').replace('Villa ', '')} />)}
          </nav>
        )}
      </Header>
      <Overview k={k} labels={labels} />
    </>
  );
}

function Overview({ k, labels }: { k: Kpis; labels: { trafficTypes: Record<string, string> } }) {
  const received = k.requests.received + k.traffic.received;
  const byType = Object.entries(k.traffic.by_type).sort((a, b) => b[1] - a[1]);
  const maxType = Math.max(1, ...byType.map(([, n]) => n));
  return (
    <div className="flex flex-col gap-4">
      <Card className="grid grid-cols-2 divide-line overflow-hidden lg:grid-cols-4 lg:divide-x [&>*]:border-line max-lg:[&>*:nth-child(-n+2)]:border-b">
        <Stat label="Reportes recibidos" value={received} detail={`${k.traffic.received} de tránsito · ${k.requests.received} al municipio`} />
        <Stat label="Resueltos" value={k.requests.resolved} detail={k.requests.received ? `de ${k.requests.received} reportes al municipio` : 'esta semana'} tone="ok" />
        <Stat label="Abiertos ahora" value={k.requests.open_now} detail="reportes al municipio sin resolver" tone={k.requests.open_now > 0 ? 'warn' : undefined} />
        <Stat
          label="Tiempo de respuesta"
          value={k.requests.avg_resolution_hours == null ? '—' : k.requests.avg_resolution_hours < 48 ? `${Math.round(k.requests.avg_resolution_hours)} h` : `${(k.requests.avg_resolution_hours / 24).toFixed(1).replace('.', ',')} d`}
          detail="promedio hasta resolver"
        />
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-lg font-bold">Tránsito por tipo</h2>
            <Link href="/admin/bandeja" className="text-sm font-semibold text-brand hover:underline">Ver bandeja</Link>
          </div>
          {byType.length === 0 ? (
            <p className="py-6 text-center text-muted">No hubo alertas de tránsito en estos días.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {byType.map(([type, n]) => (
                <li key={type}>
                  <div className="mb-1 flex justify-between text-[15px]"><span className="font-semibold">{labels.trafficTypes[type] ?? type}</span><span className="tabular-nums text-muted">{n}</span></div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-canvas" aria-hidden><div className="h-full rounded-full bg-danger" style={{ width: `${(n / maxType) * 100}%` }} /></div>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-sm text-muted">{k.traffic.published} publicadas · {k.traffic.rejected} descartadas{k.traffic.out_of_area ? ` · ${k.traffic.out_of_area} fuera de la provincia` : ''}</p>
        </Card>

        <Card className="p-5">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-lg font-bold">Lo que más piden los vecinos</h2>
            <Link href="/admin/bandeja?ver=consultas" className="text-sm font-semibold text-brand hover:underline">Ver todo</Link>
          </div>
          {k.requests.top_supported.length === 0 ? (
            <p className="py-6 text-center text-muted">Todavía no hay reportes públicos con apoyos.</p>
          ) : (
            <ol className="flex flex-col gap-2">
              {k.requests.top_supported.map((r, i) => (
                <li key={r.id}>
                  <Link href={`/consultas/${r.id}`} className="flex items-center gap-3 rounded-[12px] p-2 hover:bg-canvas">
                    <span className="w-5 text-center font-bold text-subtle">{i + 1}</span>
                    <span className="min-w-0 flex-1 truncate font-semibold">{r.title}</span>
                    <span className="flex items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-sm font-bold text-brand-strong"><ThumbsUp className="size-3.5" aria-hidden />{r.support_count}</span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <MiniStat label="Negocios activos" value={k.businesses.approved_total} detail={k.businesses.pending_now ? `${k.businesses.pending_now} por aprobar` : 'sin solicitudes pendientes'} href="/admin/validaciones" />
        <MiniStat label="Turismo publicado" value={k.tourism.places_published + k.tourism.routes_published} detail={`${k.tourism.places_published} lugares · ${k.tourism.routes_published} rutas${k.tourism.proposals_pending ? ` · ${k.tourism.proposals_pending} propuestas` : ''}`} href="/admin/validaciones" />
        <MiniStat label="Personas nuevas" value={k.users.new} detail={k.engagement.views === 1 ? "1 visita a fichas" : `${formatNumber(k.engagement.views)} visitas a fichas`} />
      </div>
    </div>
  );
}

function Header({ title, subtitle, children }: { title: string; subtitle: string; children?: React.ReactNode }) {
  return (
    <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <Eyebrow>Gestión municipal</Eyebrow>
        <h1 className="text-[28px] font-extrabold leading-tight md:text-[34px]">{title}</h1>
        <p className="mt-1 text-[16px] text-muted">{subtitle}</p>
      </div>
      {children}
    </header>
  );
}

function ScopeLink({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link href={href} aria-current={active ? 'page' : undefined} className={cn('rounded-[11px] px-3 py-2 text-[15px] font-semibold', active ? 'bg-surface shadow-sm' : 'text-muted hover:text-ink')}>
      {label}
    </Link>
  );
}

function Stat({ label, value, detail, tone }: { label: string; value: number | string; detail: string; tone?: 'ok' | 'warn' }) {
  return (
    <div className="p-5">
      <Eyebrow>{label}</Eyebrow>
      <p className={cn('mt-1 text-[40px] font-extrabold leading-none tabular-nums', tone === 'ok' && 'text-ok', tone === 'warn' && 'text-warn')}>{typeof value === 'number' ? formatNumber(value) : value}</p>
      <p className="mt-2 text-sm text-muted">{detail}</p>
    </div>
  );
}

function MiniStat({ label, value, detail, href }: { label: string; value: number; detail: string; href?: string }) {
  const body = (
    <>
      <Eyebrow>{label}</Eyebrow>
      <p className="mt-1 text-[28px] font-extrabold tabular-nums">{formatNumber(value)}</p>
      <p className="text-sm text-muted">{detail}</p>
    </>
  );
  return href ? <Link href={href} className="block rounded-[18px] bg-surface p-5 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-float)]">{body}</Link> : <Card className="p-5">{body}</Card>;
}

function BigLink({ href, label, value, tone }: { href: string; label: string; value: number; tone: 'danger' | 'brand' }) {
  return (
    <Link href={href} className="group flex items-center justify-between rounded-[18px] bg-surface p-6 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-float)]">
      <div>
        <p className={cn('text-[44px] font-extrabold leading-none tabular-nums', tone === 'danger' ? 'text-danger-strong' : 'text-brand-strong')}>{value}</p>
        <p className="mt-2 text-[16px] font-semibold">{label}</p>
      </div>
      <ArrowRight className="size-6 text-subtle transition group-hover:translate-x-1" aria-hidden />
    </Link>
  );
}
