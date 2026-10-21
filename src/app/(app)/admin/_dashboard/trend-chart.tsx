'use client';
import { useId, useState } from 'react';
import type { SeriesPoint } from '@/modules/admin';
import { cn } from '@/utils/cn';

const W = 640;
const H = 220;
const PAD = { top: 16, right: 16, bottom: 8, left: 16 };

/** Curva suave (Catmull-Rom → Bézier) que nunca pasa por debajo de cero. */
function smooth(pts: [number, number][]) {
  if (pts.length < 2) return pts.length ? `M${pts[0]![0]},${pts[0]![1]}` : '';
  let d = `M${pts[0]![0]},${pts[0]![1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]!;
    const p1 = pts[i]!;
    const p2 = pts[i + 1]!;
    const p3 = pts[i + 2] ?? p2;
    const base = H - PAD.bottom;
    const c1y = Math.min(base, p1[1] + (p2[1] - p0[1]) / 6);
    const c2y = Math.min(base, p2[1] - (p3[1] - p1[1]) / 6);
    d += ` C${p1[0] + (p2[0] - p0[0]) / 6},${c1y} ${p2[0] - (p3[0] - p1[0]) / 6},${c2y} ${p2[0]},${p2[1]}`;
  }
  return d;
}

/**
 * Recibidos frente a resueltos. Se toca (o se recorre con las flechas del teclado) cada punto para ver su valor;
 * encima se lee en palabras el valor elegido. Debajo hay una tabla equivalente para lectores de pantalla.
 */
export function TrendChart({ series }: { series: SeriesPoint[] }) {
  const id = useId();
  const [picked, setActive] = useState(series.length - 1);
  const active = Math.min(Math.max(0, picked), series.length - 1);
  const max = Math.max(1, ...series.map((p) => Math.max(p.received, p.resolved)));
  const x = (i: number) => PAD.left + (series.length === 1 ? (W - PAD.left - PAD.right) / 2 : (i * (W - PAD.left - PAD.right)) / (series.length - 1));
  const y = (v: number) => PAD.top + (1 - v / max) * (H - PAD.top - PAD.bottom);
  const line = (key: 'received' | 'resolved') => smooth(series.map((p, i) => [x(i), y(p[key])]));
  const area = `${line('received')} L${x(series.length - 1)},${H - PAD.bottom} L${x(0)},${H - PAD.bottom} Z`;
  const cur = series[active] ?? series.at(-1)!;
  const empty = series.every((p) => p.received === 0 && p.resolved === 0);
  // Con muchas fechas (90 días) se muestran unas 5 para que no se encimen; la elegida siempre se ve
  const labelStep = series.length <= 7 ? 1 : Math.ceil(series.length / 5);

  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowLeft') setActive(Math.max(0, active - 1));
    else if (e.key === 'ArrowRight') setActive(Math.min(series.length - 1, active + 1));
    else if (e.key === 'Home') setActive(0);
    else if (e.key === 'End') setActive(series.length - 1);
    else return;
    e.preventDefault();
  }

  /** Punto más cercano al puntero (ratón o dedo), sin botones dentro del gráfico. */
  function onPointer(e: React.PointerEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const f = (e.clientX - r.left) / r.width;
    setActive(Math.round(f * (series.length - 1)));
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-4 text-sm font-semibold text-muted">
          <span className="inline-flex items-center gap-2"><span className="h-1 w-5 rounded-full bg-brand" aria-hidden /> Recibidos</span>
          <span className="inline-flex items-center gap-2"><span className="h-1 w-5 rounded-full bg-ok" aria-hidden /> Resueltos</span>
        </div>
        {/* El punto elegido, en palabras (antes "[ 0 · 0 ] MIÉ", difícil de leer para quien no conoce gráficos) */}
        <p className="text-sm tabular-nums text-muted" aria-live="polite">
          <span className="font-semibold text-ink">{cur.label}:</span> <strong className="text-brand-strong">{cur.received}</strong> {cur.received === 1 ? 'recibido' : 'recibidos'} · <strong className="text-ok">{cur.resolved}</strong> {cur.resolved === 1 ? 'resuelto' : 'resueltos'}
        </p>
      </div>
      <div
        role="img"
        tabIndex={0}
        onKeyDown={onKey}
        onPointerMove={onPointer}
        onPointerDown={onPointer}
        aria-label={`Gráfico de reportes recibidos y resueltos. ${cur.label}: ${cur.received} recibidos, ${cur.resolved} resueltos. Usa las flechas para recorrerlo.`}
        className="relative cursor-crosshair touch-pan-y rounded-[14px] outline-none focus-visible:ring-4 focus-visible:ring-brand/25"
      >
        <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" preserveAspectRatio="none" aria-hidden>
          <defs>
            <linearGradient id={`${id}-g`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--color-brand)" stopOpacity="0.22" />
              <stop offset="100%" stopColor="var(--color-brand)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0, 0.5, 1].map((f) => (
            <line key={f} x1={PAD.left} x2={W - PAD.right} y1={PAD.top + f * (H - PAD.top - PAD.bottom)} y2={PAD.top + f * (H - PAD.top - PAD.bottom)} stroke="var(--color-line)" strokeDasharray={f === 1 ? undefined : '4 6'} />
          ))}
          {!empty && <path d={area} fill={`url(#${id}-g)`} className="animate-fade-in" />}
          <path d={line('resolved')} fill="none" stroke="var(--color-ok)" strokeWidth={2.5} strokeLinecap="round" />
          <path d={line('received')} fill="none" stroke="var(--color-brand)" strokeWidth={3} strokeLinecap="round" />
          <line x1={x(active)} x2={x(active)} y1={PAD.top} y2={H - PAD.bottom} stroke="var(--color-line-strong)" strokeDasharray="3 4" />
          {series.map((p, i) => (
            <g key={p.from}>
              <circle cx={x(i)} cy={y(p.received)} r={i === active ? 6 : 3.5} fill="var(--color-surface)" stroke="var(--color-brand)" strokeWidth={i === active ? 3 : 2} />
            </g>
          ))}
        </svg>
        {/* Fechas del eje en HTML: dentro del SVG escalado medían unos 6 px en el teléfono */}
        <div className="relative h-6" aria-hidden>
          {series.map((p, i) => (i === active || (i % labelStep === 0 && (labelStep === 1 || Math.abs(i - active) > 1))) && (
            <span key={p.from} style={{ left: `${(x(i) / W) * 100}%` }}
              className={cn('absolute top-1 -translate-x-1/2 whitespace-nowrap text-[13px] font-semibold', i === active ? 'font-bold text-ink' : 'text-subtle',
                i === 0 && 'translate-x-0', i === series.length - 1 && '-translate-x-full')}>{p.label}</span>
          ))}
        </div>
        {empty && <p className="pointer-events-none absolute inset-0 grid place-items-center text-[15px] text-muted">Todavía no hay reportes en este periodo.</p>}
      </div>
      <details className="mt-3 text-sm">
        <summary className="press inline-flex min-h-11 cursor-pointer items-center font-semibold text-brand">Ver como tabla</summary>
        <table className="mt-2 w-full text-left tabular-nums">
          <thead className="text-muted"><tr><th className="py-1 font-semibold">Periodo</th><th className="py-1 text-right font-semibold">Recibidos</th><th className="py-1 text-right font-semibold">Resueltos</th></tr></thead>
          <tbody>{series.map((p) => <tr key={p.from} className="border-t border-line"><td className="py-1">{p.label}</td><td className="py-1 text-right">{p.received}</td><td className="py-1 text-right">{p.resolved}</td></tr>)}</tbody>
        </table>
      </details>
    </div>
  );
}
