import Link from 'next/link';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import type { Change } from '@/modules/admin';
import { cn } from '@/utils/cn';
import { ChangeBadge, CountUp, HelpTip, Sparkline } from './kpi-parts';

// Tarjetas de indicadores del resumen (§9.7): lo urgente, la cifra protagonista, las secundarias y el inventario.

export type Level = 'calm' | 'warn' | 'danger';
const LEVEL = {
  calm: { dot: 'bg-ok', text: 'text-ink', word: 'al día' },
  warn: { dot: 'bg-warn-bright', text: 'text-warn', word: 'pendiente' },
  danger: { dot: 'bg-danger', text: 'text-danger-strong', word: 'urgente' },
} as const;

/** Lo urgente en una franja: cada parte lleva a su lista. Con todo en cero lo dice en palabras, no con cuatro ceros. */
export function AttentionStrip({ items }: { items: { label: string; value: number | string; detail?: string; href: string; level: Level; help: string }[] }) {
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
export function HeroKpi({ label, value, change: c, versus, detail, series, help }: { label: string; value: number; change: Change; versus: string; detail: string; series: number[]; help: string }) {
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
export function StatCard({ i, label, value, change: c, detail, series, seriesTone, wide, help }: {
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
export function InventoryItem({ label, value, detail, change: c, href, help }: { label: string; value: number; detail?: string; change?: Change; href?: string; help: string }) {
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
