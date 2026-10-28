import type { Metadata } from 'next';
import Link from 'next/link';
import { Sparkles, ThumbsUp, TrafficCone } from 'lucide-react';
import { getDashboard, getPanelCounts, scopeMunicipalities, type Dashboard } from '@/modules/admin/server';
import { change, formatHours, insights, parsePeriod, periodRange, waitingSince } from '@/modules/admin';
import { Card, Eyebrow, Notice } from '@/components/ui/primitives';
import { requireStaff } from '@/lib/auth';
import { getCatalogs, getLabelMaps } from '@/lib/catalogs';
import { createClient } from '@/lib/supabase/server';
import { cn } from '@/utils/cn';
import { formatDate, formatNumber, shortMunicipality as short } from '@/utils/format';
import { DashboardToolbar } from './_dashboard/toolbar';
import { Bars, Empty, Panel, Pill } from './_dashboard/blocks';
import { csvRows } from './_dashboard/csv';
import { AttentionStrip, HeroKpi, InventoryItem, StatCard } from './_dashboard/kpi-cards';
import { ModeratorHome } from './_dashboard/moderator-home';
import { TopViewed } from './_dashboard/top-viewed';
import { TrendChart } from './_dashboard/trend-chart';

export const metadata: Metadata = { title: 'Panel municipal' };


export default async function AdminHome({ searchParams }: { searchParams: Promise<{ municipio?: string; periodo?: string }> }) {
  const viewer = await requireStaff('/admin');
  const { municipio, periodo } = await searchParams;
  const [catalogs, labels] = await Promise.all([getCatalogs(), getLabelMaps()]);
  const scope = scopeMunicipalities(catalogs.municipalities, viewer.roles);
  const selected = scope.find((m) => m.id === municipio) ?? null;
  const muniId = viewer.isProvincialAdmin ? selected?.id ?? null : selected?.id ?? scope[0]?.id ?? null;
  const supabase = await createClient();

  if (!viewer.isAdmin) return <ModeratorHome counts={await getPanelCounts(supabase)} scopeNames={scope.map((m) => m.name).join(' · ')} />;

  const range = periodRange(parsePeriod(periodo));
  const d = await getDashboard(supabase, range, muniId, scope);
  if (!d) {
    return (
      <Card className="p-6">
        <Notice tone="danger">No pudimos cargar los indicadores.</Notice>
        <Link prefetch={false} href={`/admin?periodo=${range.days}`} className="press mt-4 inline-flex min-h-11 items-center rounded-[12px] bg-ink px-4 font-semibold text-on-ink">Reintentar</Link>
      </Card>
    );
  }

  const title = muniId ? scope.find((m) => m.id === muniId)?.name ?? 'Territorio' : 'Provincia Santiago Rodríguez';
  const qs = (extra: Record<string, string | null>) => {
    const p = new URLSearchParams({ periodo: String(range.days), ...(muniId ? { municipio: muniId } : {}) });
    for (const [k, v] of Object.entries(extra)) if (v) p.set(k, v); else p.delete(k);
    return `/admin?${p}`;
  };

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-4">
        <div>
          <Eyebrow>Gestión municipal · Resumen</Eyebrow>
          <h1 className="text-[28px] font-extrabold leading-tight md:text-[34px]">{title}</h1>
          <p className="mt-1 text-[16px] text-muted">
            Últimos {range.days} días · {formatDate(range.from + 'T12:00:00')} al {formatDate(range.to + 'T12:00:00')}, comparados con los {range.days} días anteriores
          </p>
        </div>
        <DashboardToolbar days={range.days} municipio={muniId} updatedAt={d.generatedAt} csv={csvRows(d, title, labels.trafficTypes)} csvName={`indicadores-${range.from}_${range.to}.csv`} />
        {(viewer.isProvincialAdmin || scope.length > 1) && (
          <nav aria-label="Territorio" className="-mx-4 flex gap-1 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:px-0 print:hidden">
            {viewer.isProvincialAdmin && <Pill href={qs({ municipio: null })} active={!muniId}>Toda la provincia</Pill>}
            {scope.map((m) => <Pill key={m.id} href={qs({ municipio: m.id })} active={muniId === m.id}>{short(m.name)}</Pill>)}
          </nav>
        )}
      </header>

      <Overview d={d} labels={labels} />
    </div>
  );
}

function Overview({ d, labels }: { d: Dashboard; labels: { trafficTypes: Record<string, string> } }) {
  const k = d.kpis;
  const p = d.prev;
  const received = k.requests.received + k.traffic.received;
  const receivedPrev = p.requests.received + p.traffic.received;
  const oldest = [d.oldestPending.request, d.oldestPending.traffic].filter(Boolean).sort()[0] ?? null;
  const now = new Date(d.generatedAt); // misma hora para toda la página (la de la consulta)
  const oldestHours = oldest ? (now.getTime() - new Date(oldest).getTime()) / 3_600_000 : null;
  const byType = Object.entries(k.traffic.by_type).sort((a, b) => b[1] - a[1]);
  const topType = byType[0] ? { label: labels.trafficTypes[byType[0][0]] ?? byType[0][0], count: byType[0][1] } : null;
  const muniTotal = d.byMunicipality?.reduce((n, m) => n + m.received, 0) ?? 0;
  const topMuni = d.byMunicipality?.[0] && muniTotal ? { name: short(d.byMunicipality[0].name), share: d.byMunicipality[0].received / muniTotal } : null;
  const highlights = insights({
    days: d.range.days, received, receivedPrev, resolved: k.requests.resolved, openNow: k.requests.open_now, oldestPendingHours: oldestHours,
    topTrafficType: topType, topMunicipality: topMuni, topViewed: d.topViewed[0] ? { name: d.topViewed[0].name, views: d.topViewed[0].views } : null,
  });
  const pendingValidation = d.counts.validations;
  const versus = `frente a los ${d.range.days} días anteriores`;
  const hours = k.requests.avg_resolution_hours;
  const hoursPrev = p.requests.avg_resolution_hours;

  return (
    <>
      {/* 1 · Lo que hay que atender: una sola franja, con su estado en color y en palabras */}
      <section aria-labelledby="atender" className="flex flex-col gap-3">
        <h2 id="atender" className="text-lg font-bold">Lo que hay que atender</h2>
        <AttentionStrip items={[
          { label: 'Abiertos ahora', value: k.requests.open_now, href: '/admin/bandeja?ver=consultas', level: k.requests.open_now > 0 ? 'warn' : 'calm',
            help: 'Reportes al municipio que todavía no se resolvieron ni se descartaron, sin importar cuándo llegaron. Es la cifra de hoy, no del periodo.' },
          { label: 'Alertas por confirmar', value: d.counts.trafficPending, href: '/admin/bandeja?estado=pending', level: d.counts.trafficPending > 0 ? 'danger' : 'calm',
            help: 'Alertas de tránsito que mandaron los vecinos y esperan que alguien del municipio las publique o descarte.' },
          { label: 'Por validar', value: pendingValidation, href: '/admin/validaciones', level: pendingValidation > 0 ? 'warn' : 'calm',
            help: 'Negocios, lugares, rutas, promociones y fotos que esperan aprobación para salir en el mapa.' },
          { label: 'Espera más antigua', value: oldest ? waitingSince(oldest, now) : 'Nada', detail: oldest ? `desde el ${formatDate(oldest)}` : undefined, href: '/admin/bandeja?ver=consultas',
            level: oldestHours == null ? 'calm' : oldestHours >= 48 ? 'danger' : 'warn',
            help: 'Cuánto lleva esperando el reporte o la alerta más antigua sin atender. Lo ideal es que no pase de 2 días.' },
        ]} />
      </section>

      {/* 2 · Cómo va el periodo: una protagonista grande y las demás más pequeñas, no todas iguales */}
      <section aria-labelledby="periodo" className="flex flex-col gap-3">
        <h2 id="periodo" className="text-lg font-bold">Cómo va el periodo</h2>
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <HeroKpi label="Reportes recibidos" value={received} change={change(received, receivedPrev, false)} versus={versus}
            detail={`${formatNumber(k.traffic.received)} de tránsito y ${formatNumber(k.requests.received)} al municipio`}
            series={d.series.map((s) => s.received)}
            help="Alertas de tránsito más reportes al municipio que llegaron en el periodo. La línea muestra cómo fueron llegando; el punto dorado es el tramo más reciente." />
          <StatCard i={2} wide label="Resueltos" value={k.requests.resolved} change={change(k.requests.resolved, p.requests.resolved, true)}
            series={d.series.map((s) => s.resolved)} seriesTone="ok"
            help="Reportes al municipio que se marcaron como resueltos en el periodo (aunque hubieran llegado antes)." />
          <StatCard i={3} label="Tiempo para resolver" value={formatHours(hours)}
            change={hours != null && hoursPrev != null ? change(Math.round(hours), Math.round(hoursPrev), false, ' h') : undefined}
            detail={hours == null ? 'Sin reportes resueltos en el periodo' : 'en promedio'}
            help="Promedio entre que llega un reporte y se marca como resuelto, de los resueltos en el periodo." />
          <StatCard i={4} label="Personas nuevas" value={k.users.new} change={change(k.users.new, p.users.new, true)}
            help="Cuentas que se crearon en el periodo." />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Panel title="Recibidos y resueltos" sub={d.range.days === 7 ? 'Por día' : 'Por semana'}>
          <TrendChart key={`${d.range.days}-${d.range.to}`} series={d.series} />
        </Panel>
        <Panel title="Aspectos destacados" sub="Escritos a partir de los datos del periodo" icon={<Sparkles className="size-4 text-warn" />}>
          <ul className="flex flex-col gap-3">
            {highlights.map((h) => (
              <li key={h} className="flex gap-3 text-[15px] leading-snug"><span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-warn-bright" aria-hidden />{h}</li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {d.byMunicipality && (
          <Panel title="Por municipio" sub="Reportes recibidos en el periodo">
            <Bars rows={d.byMunicipality.map((m) => ({ key: m.id, label: m.name, value: m.received, extra: `${m.resolved} resueltos · ${m.openNow} abiertos`, href: `/admin?periodo=${d.range.days}&municipio=${m.id}` }))} color="bg-brand" />
          </Panel>
        )}
        <Panel title="Tránsito por tipo" sub={`${k.traffic.published} publicadas · ${k.traffic.rejected} descartadas${k.traffic.out_of_area ? ` · ${k.traffic.out_of_area} fuera de la provincia` : ''}`} action={{ href: '/admin/bandeja', label: 'Ver bandeja' }}>
          {byType.length === 0 ? <Empty icon={<TrafficCone />}>No hubo alertas de tránsito en este periodo.</Empty>
            : <Bars rows={byType.map(([t, n]) => ({ key: t, label: labels.trafficTypes[t] ?? t, value: n }))} color="bg-danger" />}
        </Panel>
        <Panel title="Lo que más piden los vecinos" sub="Reportes públicos con más apoyos" action={{ href: '/admin/bandeja?ver=consultas', label: 'Ver todo' }}>
          {k.requests.top_supported.length === 0 ? <Empty icon={<ThumbsUp />}>Cuando los vecinos apoyen reportes públicos, los más pedidos saldrán aquí.</Empty> : (
            <ol className="flex flex-col">
              {k.requests.top_supported.map((r, i) => (
                <li key={r.id}>
                  <Link prefetch={false} href={`/consultas/${r.id}`} className="press-soft flex min-h-12 items-center gap-3 rounded-[12px] px-2 transition-colors duration-200 hover:bg-canvas">
                    <span className={cn('grid size-7 shrink-0 place-items-center rounded-full text-sm font-bold tabular-nums', i === 0 ? 'bg-warn-bright text-ink' : 'bg-canvas text-muted')}>{i + 1}</span>
                    <span className="min-w-0 flex-1 truncate font-semibold">{r.title}</span>
                    <span className="flex items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-sm font-bold tabular-nums text-brand-strong"><ThumbsUp className="size-3.5" aria-hidden />{r.support_count}</span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </Panel>
        <Panel title="Lo más visto" sub="Fichas con más visitas en el periodo">
          <TopViewed rows={d.topViewed} />
        </Panel>
      </div>

      {/* 3 · Contexto: lo que hay publicado. Una fila tranquila, no otra grilla de tarjetas */}
      <section aria-labelledby="contexto" className="flex flex-col gap-3">
        <h2 id="contexto" className="text-lg font-bold">Contenido del mapa</h2>
        <ul className="grid grid-cols-1 gap-px overflow-hidden rounded-[22px] border border-line bg-line shadow-[var(--shadow-card)] sm:grid-cols-3">
          <InventoryItem label="Negocios activos" value={k.businesses.approved_total} href="/negocios"
            detail={k.businesses.pending_now ? `${k.businesses.pending_now} por aprobar` : 'Sin solicitudes pendientes'} help="Negocios aprobados que hoy aparecen en el mapa." />
          <InventoryItem label="Turismo publicado" value={k.tourism.places_published + k.tourism.routes_published} href="/turismo"
            detail={`${k.tourism.places_published} lugares y ${k.tourism.routes_published} rutas`} help="Lugares y rutas publicados en el mapa." />
          <InventoryItem label="Visitas a fichas" value={k.engagement.views} change={change(k.engagement.views, p.engagement.views, true)}
            detail={d.byMunicipality ? undefined : 'De toda la provincia'}
            help="Cuántas veces se abrió la ficha de un negocio, lugar o ruta (una por persona y sesión). Siempre de toda la provincia." />
        </ul>
      </section>
    </>
  );
}
