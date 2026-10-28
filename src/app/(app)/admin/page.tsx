import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, Eye, MessageCircle, Navigation, Sparkles, ThumbsUp, TrafficCone } from 'lucide-react';
import { getDashboard, getPanelCounts, scopeMunicipalities, type Dashboard } from '@/modules/admin/server';
import { change, formatHours, insights, parsePeriod, periodRange, waitingSince, type Change } from '@/modules/admin';
import { Card, Eyebrow, Notice } from '@/components/ui/primitives';
import { requireStaff } from '@/lib/auth';
import { getCatalogs, getLabelMaps } from '@/lib/catalogs';
import { createClient } from '@/lib/supabase/server';
import { cn } from '@/utils/cn';
import { formatDate, formatNumber, shortMunicipality as short } from '@/utils/format';
import { DashboardToolbar } from './_dashboard/toolbar';
import { ChangeBadge, CountUp, HelpTip, Sparkline } from './_dashboard/kpi-parts';
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
          {d.topViewed.length === 0 ? <Empty icon={<Eye />}>Todavía no hay visitas a fichas en este periodo.</Empty> : (
            <>
            {/* Teléfono: lista, para que «Cómo llegar» y «WhatsApp» no queden ocultos a la derecha */}
            <ol className="flex flex-col md:hidden">
              {d.topViewed.map((v) => (
                <li key={v.id} className="border-b border-line last:border-0">
                  <Link prefetch={false} href={v.href} className="press-soft flex min-h-12 items-start gap-2.5 rounded-[12px] px-1 py-2.5 transition-colors duration-200 hover:bg-canvas">
                    <span className={cn('mt-0.5 h-10 w-1 shrink-0 rounded-full', v.entity === 'business' ? 'bg-layer-business' : v.entity === 'tourism_place' ? 'bg-layer-tourism' : 'bg-layer-route')} aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{v.name}</span>
                      <span className="mt-0.5 block text-sm text-muted tabular-nums">
                        {formatNumber(v.views)} {v.views === 1 ? 'visita' : 'visitas'} · {formatNumber(v.directions)} cómo llegar · {formatNumber(v.whatsapp)} WhatsApp
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
            <div className="-mx-5 hidden overflow-x-auto md:block">
              <table className="w-full min-w-[420px] text-left text-[15px]">
                <thead className="border-b border-line text-[14px] font-semibold text-muted">
                  <tr>
                    <th scope="col" className="px-5 py-2">Ficha</th>
                    <th scope="col" className="px-2 py-2 text-right"><Eye className="ml-auto size-4" aria-label="Visitas" /></th>
                    <th scope="col" className="px-2 py-2 text-right"><Navigation className="ml-auto size-4" aria-label="Cómo llegar" /></th>
                    <th scope="col" className="px-5 py-2 text-right"><MessageCircle className="ml-auto size-4" aria-label="WhatsApp" /></th>
                  </tr>
                </thead>
                <tbody>
                  {d.topViewed.map((v) => (
                    <tr key={v.id} className="border-b border-line transition-colors duration-200 last:border-0 hover:bg-canvas">
                      <td className="px-5 py-0.5">
                        <Link prefetch={false} href={v.href} className="flex min-h-11 items-center gap-2.5 font-semibold hover:text-brand">
                          <span className={cn('h-6 w-1 shrink-0 rounded-full', v.entity === 'business' ? 'bg-layer-business' : v.entity === 'tourism_place' ? 'bg-layer-tourism' : 'bg-layer-route')} aria-hidden />
                          <span className="truncate">{v.name}</span>
                        </Link>
                      </td>
                      <td className="px-2 text-right font-semibold tabular-nums">{formatNumber(v.views)}</td>
                      <td className="px-2 text-right tabular-nums text-muted">{formatNumber(v.directions)}</td>
                      <td className="px-5 text-right tabular-nums text-muted">{formatNumber(v.whatsapp)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )}
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

/* ── Piezas ─────────────────────────────────────────────────────────────── */

type Level = 'calm' | 'warn' | 'danger';
const LEVEL = {
  calm: { dot: 'bg-ok', text: 'text-ink', word: 'al día' },
  warn: { dot: 'bg-warn-bright', text: 'text-warn', word: 'pendiente' },
  danger: { dot: 'bg-danger', text: 'text-danger-strong', word: 'urgente' },
} as const;

/** Lo urgente en una franja: cada parte lleva a su lista. Con todo en cero lo dice en palabras, no con cuatro ceros. */
function AttentionStrip({ items }: { items: { label: string; value: number | string; detail?: string; href: string; level: Level; help: string }[] }) {
  const allClear = items.every((it) => it.level === 'calm');
  return (
    <div className="kpi-rise overflow-hidden rounded-[22px] border border-line bg-surface shadow-[var(--shadow-card)]">
      {allClear && (
        <p className="flex items-center gap-2 border-b border-line bg-ok-soft px-4 py-3 text-[15px] font-semibold text-ok sm:px-5">
          <CheckCircle2 className="size-5 shrink-0" aria-hidden />Todo al día: no hay nada esperando respuesta.
        </p>
      )}
      <ul className={cn('grid grid-cols-2 gap-px bg-line', items.length === 4 ? 'xl:grid-cols-4' : 'sm:grid-cols-3', '[&>li:last-child:nth-child(odd)]:col-span-2 sm:[&>li:last-child:nth-child(odd)]:col-span-1')}>
        {items.map((it) => {
          const l = LEVEL[it.level];
          return (
            <li key={it.label} className="relative bg-surface">
              <Link prefetch={false} href={it.href} className="press-soft group flex h-full min-h-[128px] flex-col p-4 pr-11 transition-colors duration-200 hover:bg-canvas focus-visible:bg-canvas sm:p-5 sm:pr-12">
                <span className="flex items-center gap-2 text-[14px] font-semibold leading-snug text-muted">
                  <span className={cn('size-2.5 shrink-0 rounded-full', l.dot)} aria-hidden />
                  {it.label}<span className="sr-only">, {l.word}</span>
                </span>
                <span className={cn('mt-2 font-display font-extrabold leading-none tracking-tight tabular-nums', allClear ? 'text-subtle' : l.text, typeof it.value === 'string' ? 'text-[26px] sm:text-[30px]' : 'text-[34px] sm:text-[40px]')}>
                  {typeof it.value === 'number' ? <CountUp value={it.value} /> : it.value}
                </span>
                {it.detail && <span className="mt-1.5 text-[13px] text-muted">{it.detail}</span>}
                <ArrowRight className="mt-auto size-4 self-end text-subtle transition-transform duration-200 group-hover:translate-x-1 group-hover:text-ink" aria-hidden />
              </Link>
              <HelpTip className="absolute right-0.5 top-0.5" label={it.label} text={it.help} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** La cifra protagonista del periodo: grande, con su comparación en palabras y la línea de cómo fue llegando. */
function HeroKpi({ label, value, change: c, versus, detail, series, help }: { label: string; value: number; change: Change; versus: string; detail: string; series: number[]; help: string }) {
  return (
    <article className="kpi-rise relative col-span-2 flex flex-col overflow-hidden rounded-[22px] border border-line bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6 xl:row-span-2" style={{ '--i': 1 } as React.CSSProperties}>
      {/* El único toque de color de marca del panel: el degradado del ícono de la app */}
      <span className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-brand-strong to-layer-route" aria-hidden />
      <h3 className="pr-10 font-sans text-[15px] font-semibold text-muted">{label}</h3>
      <CountUp value={value} className="mt-2 font-display text-[56px] font-black leading-[0.95] tracking-tight tabular-nums sm:text-[72px]" />
      <div className="mt-3"><ChangeBadge c={c} versus={versus} size="lg" /></div>
      <p className="mt-2 text-[15px] text-muted">{detail}</p>
      <Sparkline values={series} className="mt-auto h-20 pt-5 xl:h-28" />
      <HelpTip className="absolute right-2 top-3" label={label} text={help} />
    </article>
  );
}

/** Indicador secundario: más pequeño que la protagonista, con su comparación y, si aporta, su tendencia. */
function StatCard({ i, label, value, change: c, detail, series, seriesTone, wide, help }: {
  i: number; label: string; value: number | string; change?: Change; detail?: string; series?: number[]; seriesTone?: 'brand' | 'ok'; wide?: boolean; help: string;
}) {
  return (
    <article className={cn('kpi-rise relative flex flex-col rounded-[18px] border border-line bg-surface p-4 shadow-[var(--shadow-card)] sm:p-5', wide && 'col-span-2')} style={{ '--i': i } as React.CSSProperties}>
      <h3 className="pr-9 font-sans text-[14px] font-semibold leading-snug text-muted">{label}</h3>
      <div className={cn('mt-1.5 flex gap-x-4 gap-y-2', wide ? 'flex-wrap items-end justify-between' : 'flex-col')}>
        <div className="flex flex-col gap-1.5">
          <span className={cn('font-display font-extrabold leading-none tracking-tight tabular-nums', typeof value === 'number' ? 'text-[34px] sm:text-[38px]' : 'text-[26px] sm:text-[30px]')}>
            {typeof value === 'number' ? <CountUp value={value} /> : value}
          </span>
          {c && <span><ChangeBadge c={c} /></span>}
        </div>
        {wide && series && <Sparkline values={series} tone={seriesTone} className="h-12 min-w-[45%] flex-1 basis-40" />}
      </div>
      {detail && <p className="mt-2 text-[13px] text-muted">{detail}</p>}
      <HelpTip className="absolute right-0.5 top-0.5" label={label} text={help} />
    </article>
  );
}

/** Lo publicado en el mapa: fila tranquila. En el teléfono, etiqueta a la izquierda y cifra a la derecha. */
function InventoryItem({ label, value, detail, change: c, href, help }: { label: string; value: number; detail?: string; change?: Change; href?: string; help: string }) {
  const body = (
    <>
      <span className="flex min-w-0 flex-col">
        <span className="text-[14px] font-semibold text-muted">{label}</span>
        {detail && <span className="text-[13px] text-muted">{detail}</span>}
        {c && <span className="mt-1"><ChangeBadge c={c} /></span>}
      </span>
      <CountUp value={value} className="font-display text-[30px] font-extrabold leading-none tabular-nums sm:mt-2 sm:text-[34px]" />
    </>
  );
  const cls = 'flex h-full min-h-[84px] items-center justify-between gap-4 p-4 pr-12 sm:flex-col-reverse sm:items-start sm:justify-end sm:p-5 sm:pr-12';
  return (
    <li className="relative bg-surface">
      {href ? <Link prefetch={false} href={href} className={cn('press-soft transition-colors duration-200 hover:bg-canvas', cls)}>{body}</Link> : <div className={cls}>{body}</div>}
      <HelpTip className="absolute right-0.5 top-0.5" label={label} text={help} />
    </li>
  );
}

function Panel({ title, sub, action, icon, children }: { title: string; sub?: string; action?: { href: string; label: string }; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card className="flex flex-col border border-line p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-[17px] font-bold">{icon}{title}</h3>
          {sub && <p className="text-sm text-muted">{sub}</p>}
        </div>
        {action && <Link prefetch={false} href={action.href} className="press -my-2 -mr-2 inline-flex min-h-11 shrink-0 items-center px-2 text-sm font-semibold text-brand hover:underline print:hidden">{action.label}</Link>}
      </div>
      {children}
    </Card>
  );
}

function Bars({ rows, color }: { rows: { key: string; label: string; value: number; extra?: string; href?: string }[]; color: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((r) => {
        const inner = (
          <>
            <div className="mb-1 flex items-baseline justify-between gap-2 text-[15px]">
              <span className="truncate font-semibold">{r.label}</span>
              <span className="font-semibold tabular-nums text-muted">{formatNumber(r.value)}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-track" aria-hidden>
              <div className={cn('kpi-bar h-full rounded-full', color)} style={{ width: `${Math.max(r.value ? 4 : 0, (r.value / max) * 100)}%` }} />
            </div>
            {r.extra && <p className="mt-1 text-[13px] text-muted">{r.extra}</p>}
          </>
        );
        return <li key={r.key}>{r.href ? <Link prefetch={false} href={r.href} className="press-soft -mx-2 block rounded-[12px] p-2 transition-colors duration-200 hover:bg-canvas">{inner}</Link> : inner}</li>;
      })}
    </ul>
  );
}

/** Sin datos: corto, con un ícono suave, y sin ocupar media pantalla. */
function Empty({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 py-6 text-center">
      <span className="grid size-10 place-items-center rounded-full bg-canvas text-subtle [&>svg]:size-5" aria-hidden>{icon}</span>
      <p className="max-w-xs text-[15px] text-muted">{children}</p>
    </div>
  );
}

function Pill({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link prefetch={false} href={href} scroll={false} aria-current={active ? 'page' : undefined}
      className={cn('press inline-flex min-h-11 shrink-0 items-center rounded-full px-4 text-[15px] font-semibold transition-colors duration-200', active ? 'bg-ink text-on-ink' : 'bg-surface text-muted shadow-[var(--shadow-card)] hover:text-ink')}>
      {children}
    </Link>
  );
}

/* ── Moderación: su trabajo pendiente ───────────────────────────────────── */

function ModeratorHome({ counts, scopeNames }: { counts: { trafficPending: number; requestsPending: number; requestsInReview: number; validations: number }; scopeNames: string }) {
  const reports = counts.requestsPending + counts.requestsInReview;
  return (
    <div className="flex flex-col gap-5">
      <header>
        <Eyebrow>Moderación</Eyebrow>
        <h1 className="text-[28px] font-extrabold leading-tight md:text-[34px]">Tu trabajo hoy</h1>
        <p className="mt-1 text-[16px] text-muted">{scopeNames}</p>
      </header>
      <AttentionStrip items={[
        { label: 'Alertas por confirmar', value: counts.trafficPending, href: '/admin/bandeja', level: counts.trafficPending ? 'danger' : 'calm', help: 'Alertas de tránsito que esperan que las publiques o descartes.' },
        { label: 'Reportes por revisar', value: reports, href: '/admin/bandeja?ver=consultas', level: reports ? 'warn' : 'calm', help: 'Reportes al municipio nuevos o en revisión.' },
        { label: 'Por validar', value: counts.validations, href: '/admin/validaciones', level: counts.validations ? 'warn' : 'calm', help: 'Negocios, lugares, rutas, promociones y fotos que esperan aprobación.' },
      ]} />
    </div>
  );
}

/* ── CSV ────────────────────────────────────────────────────────────────── */

function csvRows(d: Dashboard, territory: string, trafficTypes: Record<string, string>) {
  const k = d.kpis;
  const p = d.prev;
  const rows: (string | number | null)[][] = [
    ['SR Conecta · Indicadores', territory],
    ['Periodo', `${d.range.from} a ${d.range.to}`, 'Periodo anterior', `${d.range.prevFrom} a ${d.range.prevTo}`],
    [],
    ['Indicador', 'Periodo', 'Periodo anterior'],
    ['Reportes recibidos', k.traffic.received + k.requests.received, p.traffic.received + p.requests.received],
    ['Alertas de tránsito', k.traffic.received, p.traffic.received],
    ['Reportes al municipio', k.requests.received, p.requests.received],
    ['Resueltos', k.requests.resolved, p.requests.resolved],
    ['Descartados', k.requests.rejected, p.requests.rejected],
    ['Abiertos hoy', k.requests.open_now, null],
    ['Horas promedio para resolver', k.requests.avg_resolution_hours == null ? null : Math.round(k.requests.avg_resolution_hours * 10) / 10, p.requests.avg_resolution_hours == null ? null : Math.round(p.requests.avg_resolution_hours * 10) / 10],
    ['Personas nuevas', k.users.new, p.users.new],
    ['Visitas a fichas (toda la provincia)', k.engagement.views, p.engagement.views],
    [],
    ['Tramo', 'Recibidos', 'Resueltos'],
    ...d.series.map((s) => [`${s.from} a ${s.to}`, s.received, s.resolved]),
    [],
    ['Tipo de alerta', 'Cantidad'],
    ...Object.entries(k.traffic.by_type).map(([t, n]) => [trafficTypes[t] ?? t, n]),
  ];
  if (d.byMunicipality) rows.push([], ['Municipio', 'Recibidos', 'Resueltos', 'Abiertos'], ...d.byMunicipality.map((m) => [m.name, m.received, m.resolved, m.openNow]));
  if (d.topViewed.length) rows.push([], ['Ficha', 'Visitas', 'Cómo llegar', 'WhatsApp'], ...d.topViewed.map((v) => [v.name, v.views, v.directions, v.whatsapp]));
  return rows;
}
