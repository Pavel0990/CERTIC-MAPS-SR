'use client';
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Equal } from 'lucide-react';
import { kpiNumber, type Change } from '@/modules/admin';
import { cn } from '@/utils/cn';
import { monotonePath } from './path';

const reduceMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
// En el servidor no hay layout: el efecto solo corre en el navegador
const useBrowserLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/**
 * Número que cuenta de 0 a su valor al aparecer (600 ms, frena al final) y de un valor al otro al actualizar.
 * El HTML del servidor ya trae el valor final: sin JavaScript, o con movimiento reducido, se ve tal cual.
 * Los lectores de pantalla leen el valor final, nunca los intermedios.
 */
export function CountUp({ value, className }: { value: number; className?: string }) {
  const el = useRef<HTMLSpanElement>(null);
  const from = useRef(0);
  useBrowserLayoutEffect(() => {
    const node = el.current;
    if (!node) return;
    const start = from.current;
    from.current = value;
    if (reduceMotion() || start === value) { node.textContent = kpiNumber(value); return; }
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / 600);
      node.textContent = kpiNumber(Math.round(start + (value - start) * (1 - (1 - k) ** 3)));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    node.textContent = kpiNumber(start);
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); node.textContent = kpiNumber(value); };
  }, [value]);
  return (
    <span className={className}>
      <span ref={el} aria-hidden>{kpiNumber(value)}</span>
      <span className="sr-only">{kpiNumber(value)}</span>
    </span>
  );
}

/**
 * Mini-gráfico de la tendencia del periodo: se descubre de izquierda a derecha al aparecer y marca el tramo actual con el sol de la marca.
 * Es decorativo (el gráfico grande tiene su tabla equivalente).
 */
export function Sparkline({ values, tone = 'brand', className }: { values: number[]; tone?: 'brand' | 'ok'; className?: string }) {
  const id = useId();
  if (values.length < 2) return null;
  const max = Math.max(1, ...values);
  const pts = values.map((v, i) => [(i / (values.length - 1)) * 100, 30 - (v / max) * 26] as [number, number]);
  const line = monotonePath(pts);
  const last = pts.at(-1)!;
  const stroke = tone === 'ok' ? 'var(--color-ok)' : 'var(--color-brand)';
  return (
    <div className={cn('relative h-10', className)} aria-hidden>
      <svg viewBox="0 0 100 32" preserveAspectRatio="none" className="kpi-reveal size-full overflow-visible">
        <defs>
          <linearGradient id={`${id}-f`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={stroke} stopOpacity="0.18" />
            <stop offset="1" stopColor={stroke} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${line} L100,32 L0,32 Z`} fill={`url(#${id}-f)`} />
        <path d={line} fill="none" stroke={stroke} strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </svg>
      {/* El punto va fuera del SVG estirado para que siga siendo un círculo */}
      <span className="kpi-pop absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-warn-bright ring-2 ring-surface" style={{ left: `${last[0]}%`, top: `${(last[1] / 32) * 100}%` }} />
    </div>
  );
}

/** Flecha, cifra y color: verde si mejora, rojo si empeora, gris si da igual. Con texto para lectores de pantalla. */
export function ChangeBadge({ c, versus, size = 'md' }: { c: Change; versus?: string; size?: 'md' | 'lg' }) {
  const Icon = c.arrow === 'up' ? ArrowUpRight : c.arrow === 'down' ? ArrowDownRight : Equal;
  const tone = c.tone === 'good' ? 'bg-ok-soft text-ok' : c.tone === 'bad' ? 'bg-danger-soft text-danger-strong' : 'bg-canvas text-muted';
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className={cn('inline-flex items-center gap-0.5 rounded-full font-bold tabular-nums', tone, size === 'lg' ? 'px-2.5 py-1 text-[15px]' : 'px-2 py-0.5 text-[13px]')}>
        <Icon className={size === 'lg' ? 'size-4' : 'size-3.5'} strokeWidth={2.5} aria-hidden />
        <span aria-hidden>{c.short}</span>
        <span className="sr-only">{c.spoken}</span>
      </span>
      {versus && <span className="text-[13px] text-muted" aria-hidden>{versus}</span>}
    </span>
  );
}

const OPEN_EVENT = 'kpi-help-open';

/**
 * "?" que explica el indicador. Se abre al tocarlo, se cierra con Escape, tocando fuera o al abrir otro:
 * nunca quedan dos explicaciones abiertas encima de las tarjetas.
 */
export function HelpTip({ label, text, className }: { label: string; text: string; className?: string }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onOther = (e: Event) => { if ((e as CustomEvent<string>).detail !== id) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); button.current?.focus(); } };
    const onDown = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    window.addEventListener(OPEN_EVENT, onOther);
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => {
      window.removeEventListener(OPEN_EVENT, onOther);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [open, id]);

  function toggle() {
    if (!open) window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: id }));
    setOpen(!open);
  }

  return (
    <div ref={box} className={cn('z-10 print:hidden', className)}>
      {/* Área táctil de 44 px; el círculo visible es de 28 px para no competir con la cifra */}
      <button ref={button} type="button" onClick={toggle} aria-expanded={open} aria-controls={`${id}-t`} aria-label={`Qué mide «${label}»`}
        className="group/q grid size-11 place-items-center rounded-full outline-none">
        <span aria-hidden className={cn('grid size-7 place-items-center rounded-full border text-[13px] font-bold transition-colors duration-200 group-focus-visible/q:ring-4 group-focus-visible/q:ring-brand/30',
          open ? 'border-ink bg-ink text-on-ink' : 'border-line text-muted group-hover/q:border-line-strong group-hover/q:text-ink')}>?</span>
      </button>
      {open && (
        <p id={`${id}-t`} role="note" className="kpi-tip absolute right-1 top-12 w-[min(17rem,calc(100vw-3rem))] rounded-[14px] bg-ink p-3.5 text-[14px] leading-snug text-on-ink shadow-[var(--shadow-float)]">
          {text}
        </p>
      )}
    </div>
  );
}
