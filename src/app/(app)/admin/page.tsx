import type { Metadata } from 'next';
import Link from 'next/link';
import { AlertTriangle, ArrowRight, CheckCircle2, ClipboardCheck, Clock, Eye, Inbox, Navigation, MessageCircle, Sparkles, ThumbsUp, TrafficCone, Users } from 'lucide-react';
import { getDashboard, getPanelCounts, scopeMunicipalities, type Dashboard } from '@/modules/admin/server';
import { delta, formatHours, insights, parsePeriod, periodRange, waitingSince, type Delta } from '@/modules/admin';
import { Card, Eyebrow, Notice } from '@/components/ui/primitives';
import { requireStaff } from '@/lib/auth';
import { getCatalogs, getLabelMaps } from '@/lib/catalogs';
import { createClient } from '@/lib/supabase/server';
import { cn } from '@/utils/cn';
import { formatDate, formatNumber, shortMunicipality as short } from '@/utils/format';
import { DashboardToolbar } from './_dashboard/toolbar';
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

  return (
    <>
      {/* 1 · Lo que hay que atender */}
      <section aria-labelledby="atender" className="flex flex-col gap-3">
        <h2 id="atender" className="text-lg font-bold">Lo que hay que atender</h2>
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <Kpi icon={<Inbox />} label="Abiertos ahora" value={k.requests.open_now} href="/admin/bandeja?ver=consultas"
            help="Reportes al municipio que todavía no se resolvieron ni se descartaron, sin importar cuándo llegaron. Es la cifra de hoy, no del periodo."
            tone={k.requests.open_now > 0 ? 'warn' : undefined} />
          <Kpi icon={<TrafficCone />} label="Alertas por confirmar" value={d.counts.trafficPending} href="/admin/bandeja?estado=pending"
            help="Alertas de tránsito que mandaron los vecinos y esperan que alguien del municipio las publique o descarte." tone={d.counts.trafficPending > 0 ? 'danger' : undefined} />
          <Kpi icon={<ClipboardCheck />} label="Por validar" value={pendingValidation} href="/admin/validaciones"
            help="Negocios, lugares, rutas, promociones y fotos que esperan aprobación para salir en el mapa." tone={pendingValidation > 0 ? 'warn' : undefined} />
          <Kpi icon={<Clock />} label="Espera más antigua" value={oldest ? waitingSince(oldest, now) : '—'} href="/admin/bandeja?ver=consultas"
            help="Cuánto lleva esperando el reporte o la alerta más antigua sin atender. Lo ideal es que no pase de 2 días."
            detail={oldest ? `desde el ${formatDate(oldest)}` : 'nada pendiente'} tone={oldestHours != null && oldestHours >= 48 ? 'danger' : undefined} />
        </div>
      </section>

      {/* 2 · Cómo va el periodo */}
      <section aria-labelledby="periodo" className="flex flex-col gap-3">
        <h2 id="periodo" className="text-lg font-bold">Cómo va el periodo</h2>
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <Kpi icon={<AlertTriangle />} label="Reportes recibidos" value={received} delta={delta(received, receivedPrev, false)}
            help="Alertas de tránsito más reportes al municipio que llegaron en el periodo." detail={`${k.traffic.received} de tránsito · ${k.requests.received} al municipio`} />
          <Kpi icon={<CheckCircle2 />} label="Resueltos" value={k.requests.resolved} delta={delta(k.requests.resolved, p.requests.resolved, true)} tone="ok"
            help="Reportes al municipio que se marcaron como resueltos en el periodo (aunque hubieran llegado antes)." />
          <Kpi icon={<Clock />} label="Tiempo para resolver" value={formatHours(k.requests.avg_resolution_hours)}
            delta={k.requests.avg_resolution_hours != null && p.requests.avg_resolution_hours != null ? delta(k.requests.avg_resolution_hours, p.requests.avg_resolution_hours, false) : undefined}
            help="Promedio entre que llega un reporte y se marca como resuelto, de los resueltos en el periodo."
            detail={k.requests.avg_resolution_hours == null ? 'sin reportes resueltos en el periodo' : undefined} />
          <Kpi icon={<Users />} label="Personas nuevas" value={k.users.new} delta={delta(k.users.new, p.users.new, true)}
            help="Cuentas que se crearon en el periodo." detail={`${formatNumber(k.engagement.views)} visitas a fichas`} />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Panel title="Recibidos y resueltos" sub={d.range.days === 7 ? 'Por día' : 'Por semana'}>
          <TrendChart key={`${d.range.days}-${d.range.to}`} series={d.series} />
        </Panel>
        <Panel title="Aspectos destacados" sub="Generados con los datos del periodo" icon={<Sparkles className="size-4" />}>
          <ul className="flex flex-col gap-3">
            {highlights.map((h) => (
              <li key={h} className="flex gap-3 text-[15px] leading-snug"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-brand" aria-hidden />{h}</li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {d.byMunicipality && (
          <Panel title="Por municipio" sub="Reportes recibidos en el periodo">
            <Bars rows={d.byMunicipality.map((m) => ({ key: m.id, label: m.name, value: m.received, extra: `${m.resolved} resueltos · ${m.openNow} abiertos`, href: `/admin?periodo=${d.range.days}&municipio=${m.id}` }))} color="bg-brand" />
          </Panel>
        )}
        <Panel title="Tránsito por tipo" sub={`${k.traffic.published} publicadas · ${k.traffic.rejected} descartadas${k.traffic.out_of_area ? ` · ${k.traffic.out_of_area} fuera de la provincia` : ''}`} action={{ href: '/admin/bandeja', label: 'Ver bandeja' }}>
          {byType.length === 0 ? <Empty>No hubo alertas de tránsito en este periodo.</Empty>
            : <Bars rows={byType.map(([t, n]) => ({ key: t, label: labels.trafficTypes[t] ?? t, value: n }))} color="bg-danger" />}
        </Panel>
        <Panel title="Lo que más piden los vecinos" sub="Reportes públicos con más apoyos" action={{ href: '/admin/bandeja?ver=consultas', label: 'Ver todo' }}>
          {k.requests.top_supported.length === 0 ? <Empty>Todavía no hay reportes públicos con apoyos.</Empty> : (
            <ol className="flex flex-col">
              {k.requests.top_supported.map((r, i) => (
                <li key={r.id}>
                  <Link prefetch={false} href={`/consultas/${r.id}`} className="press-soft flex min-h-12 items-center gap-3 rounded-[12px] px-2 hover:bg-canvas">
                    <span className={cn('grid size-7 shrink-0 place-items-center rounded-full font-mono text-sm font-bold', i === 0 ? 'bg-warn-bright text-ink' : 'bg-canvas text-muted')}>{i + 1}</span>
                    <span className="min-w-0 flex-1 truncate font-semibold">{r.title}</span>
                    <span className="flex items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 font-mono text-sm font-bold text-brand-strong"><ThumbsUp className="size-3.5" aria-hidden />{r.support_count}</span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </Panel>
        <Panel title="Lo más visto" sub="Fichas con más visitas en el periodo">
          {d.topViewed.length === 0 ? <Empty>Todavía no hay visitas a fichas en este periodo.</Empty> : (
            <>
            {/* Teléfono: lista, para que «Cómo llegar» y «WhatsApp» no queden ocultos a la derecha */}
            <ol className="flex flex-col md:hidden">
              {d.topViewed.map((v) => (
                <li key={v.id} className="border-b border-line last:border-0">
                  <Link prefetch={false} href={v.href} className="press-soft flex min-h-12 items-start gap-2.5 rounded-[12px] px-1 py-2.5 hover:bg-canvas">
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
                    <tr key={v.id} className="border-b border-line last:border-0">
                      <td className="px-5 py-0.5">
                        <Link prefetch={false} href={v.href} className="flex min-h-11 items-center gap-2.5 font-semibold hover:text-brand">
                          <span className={cn('h-6 w-1 shrink-0 rounded-full', v.entity === 'business' ? 'bg-layer-business' : v.entity === 'tourism_place' ? 'bg-layer-tourism' : 'bg-layer-route')} aria-hidden />
                          <span className="truncate">{v.name}</span>
                        </Link>
                      </td>
                      <td className="px-2 text-right font-mono tabular-nums">{formatNumber(v.views)}</td>
                      <td className="px-2 text-right font-mono tabular-nums text-muted">{formatNumber(v.directions)}</td>
                      <td className="px-5 text-right font-mono tabular-nums text-muted">{formatNumber(v.whatsapp)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )}
        </Panel>
      </div>

      <section aria-labelledby="contexto" className="flex flex-col gap-3">
        <h2 id="contexto" className="text-lg font-bold">Contenido del mapa</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 [&>*:last-child]:col-span-2 sm:[&>*:last-child]:col-span-1">
          <Kpi icon={<ClipboardCheck />} label="Negocios activos" value={k.businesses.approved_total} href="/negocios" help="Negocios aprobados que hoy aparecen en el mapa." detail={k.businesses.pending_now ? `${k.businesses.pending_now} por aprobar` : 'sin solicitudes pendientes'} />
          <Kpi icon={<Navigation />} label="Turismo publicado" value={k.tourism.places_published + k.tourism.routes_published} href="/turismo" help="Lugares y rutas publicados en el mapa." detail={`${k.tourism.places_published} lugares · ${k.tourism.routes_published} rutas`} />
          <Kpi icon={<Eye />} label="Visitas a fichas" value={k.engagement.views} delta={delta(k.engagement.views, p.engagement.views, true)} help="Cuántas veces se abrió la ficha de un negocio, lugar o ruta (una por persona y sesión). Siempre de toda la provincia." detail={d.byMunicipality ? undefined : 'de toda la provincia'} />
        </div>
      </section>
    </>
  );
}

/* ── Piezas ─────────────────────────────────────────────────────────────── */

const TONE = { ok: 'text-ok', warn: 'text-warn', danger: 'text-danger-strong' } as const;

function Kpi({ icon, label, value, detail, delta: dl, help, href, tone }: {
  icon: React.ReactNode; label: string; value: number | string; detail?: string; delta?: Delta; help: string; href?: string; tone?: keyof typeof TONE;
}) {
  const body = (
    <>
      <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-ink text-on-ink sm:size-11 sm:rounded-[12px] [&>svg]:size-5" aria-hidden>{icon}</span>
      <p className="mt-3 pr-6 text-[14px] font-semibold leading-snug text-muted sm:mt-4">{label}</p>
      <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <p className={cn('text-[26px] font-extrabold leading-tight tracking-tight tabular-nums sm:text-[32px] sm:leading-none', tone && TONE[tone])}>{typeof value === 'number' ? formatNumber(value) : value}</p>
        {dl && <DeltaPill d={dl} />}
      </div>
      {detail && <p className="mt-2 text-sm text-muted">{detail}</p>}
    </>
  );
  return (
    <div className="relative">
      {href ? (
        <Link prefetch={false} href={href} className="press-soft group block h-full rounded-[18px] border border-line bg-surface p-4 pb-10 shadow-[var(--shadow-card)] hover:border-line-strong hover:shadow-[var(--shadow-float)] sm:p-5 sm:pb-5">
          {body}
          <ArrowRight className="absolute bottom-4 right-4 size-4 sm:bottom-5 sm:right-5 text-subtle transition group-hover:translate-x-0.5 group-hover:text-ink" aria-hidden />
        </Link>
      ) : (
        <div className="h-full rounded-[18px] border border-line bg-surface p-4 shadow-[var(--shadow-card)] sm:p-5">{body}</div>
      )}
      <Help text={help} label={label} />
    </div>
  );
}

/** "?" que explica el indicador en lenguaje sencillo. Funciona con toque, ratón y teclado. */
function Help({ text, label }: { text: string; label: string }) {
  return (
    <details className="group/help absolute right-2.5 top-2.5 print:hidden">
      {/* Área táctil de 44 px; el círculo visible sigue siendo de 32 px */}
      <summary aria-label={`Qué mide «${label}»`} className="press group/q grid size-11 cursor-pointer list-none place-items-center rounded-full [&::-webkit-details-marker]:hidden">
        <span className="grid size-8 place-items-center rounded-full border border-line text-sm font-bold text-muted group-hover/q:bg-canvas" aria-hidden>?</span>
      </summary>
      <p className="animate-fade-in absolute right-1.5 top-12 z-20 w-64 rounded-[14px] bg-ink p-3 text-sm leading-snug text-on-ink shadow-[var(--shadow-float)]">{text}</p>
    </details>
  );
}

function DeltaPill({ d }: { d: Delta }) {
  const arrow = d.direction === 'up' ? '▲' : d.direction === 'down' ? '▼' : '=';
  const color = d.good === null ? 'border-line text-muted' : d.good ? 'border-ok/30 bg-ok-soft text-ok' : 'border-danger/30 bg-danger-soft text-danger-strong';
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[12px] font-bold tabular-nums', color)} title="Comparado con el periodo anterior">
      <span aria-hidden>{arrow}</span>
      {d.pct === null ? 'nuevo' : d.direction === 'same' ? 'igual' : `${Math.abs(d.pct)} %`}
      <span className="sr-only">: {d.text} frente al periodo anterior{d.good === null ? '' : d.good ? ', mejora' : ', empeora'}</span>
    </span>
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
              <span className="font-mono tabular-nums text-muted">{formatNumber(r.value)}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-canvas" aria-hidden>
              <div className={cn('h-full rounded-full transition-[width] duration-500', color)} style={{ width: `${Math.max(r.value ? 4 : 0, (r.value / max) * 100)}%` }} />
            </div>
            {r.extra && <p className="mt-1 text-[13px] text-muted">{r.extra}</p>}
          </>
        );
        return <li key={r.key}>{r.href ? <Link prefetch={false} href={r.href} className="press-soft -mx-2 block rounded-[12px] p-2 hover:bg-canvas">{inner}</Link> : inner}</li>;
      })}
    </ul>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-8 text-center text-[15px] text-muted">{children}</p>;
}

function Pill({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link prefetch={false} href={href} scroll={false} aria-current={active ? 'page' : undefined}
      className={cn('press inline-flex min-h-11 shrink-0 items-center rounded-full px-4 text-[15px] font-semibold', active ? 'bg-ink text-on-ink' : 'bg-surface text-muted shadow-[var(--shadow-card)] hover:text-ink')}>
      {children}
    </Link>
  );
}

/* ── Moderación: su trabajo pendiente ───────────────────────────────────── */

function ModeratorHome({ counts, scopeNames }: { counts: { trafficPending: number; requestsPending: number; requestsInReview: number; validations: number }; scopeNames: string }) {
  return (
    <div className="flex flex-col gap-5">
      <header>
        <Eyebrow>Moderación</Eyebrow>
        <h1 className="text-[28px] font-extrabold leading-tight md:text-[34px]">Tu trabajo hoy</h1>
        <p className="mt-1 text-[16px] text-muted">{scopeNames}</p>
      </header>
      {/* Con todo en cero, decirlo con palabras: tres ceros solos no dicen si falta cargar algo o si ya terminó */}
      {counts.trafficPending + counts.requestsPending + counts.requestsInReview + counts.validations === 0 && (
        <Notice tone="ok"><span className="inline-flex items-center gap-2 font-semibold"><CheckCircle2 className="size-5 shrink-0" aria-hidden />Todo al día: no hay nada pendiente por ahora.</span></Notice>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 [&>*:last-child]:col-span-2 sm:[&>*:last-child]:col-span-1">
        <Kpi icon={<TrafficCone />} label="Alertas por confirmar" value={counts.trafficPending} href="/admin/bandeja" help="Alertas de tránsito que esperan que las publiques o descartes." tone={counts.trafficPending ? 'danger' : undefined} />
        <Kpi icon={<Inbox />} label="Reportes por revisar" value={counts.requestsPending + counts.requestsInReview} href="/admin/bandeja?ver=consultas" help="Reportes al municipio nuevos o en revisión." tone={counts.requestsPending ? 'warn' : undefined} />
        <Kpi icon={<ClipboardCheck />} label="Por validar" value={counts.validations} href="/admin/validaciones" help="Negocios, lugares, rutas, promociones y fotos que esperan aprobación." />
      </div>
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
