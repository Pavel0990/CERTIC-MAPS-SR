// Dashboard de indicadores del panel (§9.7, REPARTO B5-B7). Lógica pura, sin base ni React:
// periodos, series para el gráfico, comparación con el periodo anterior, tiempos legibles,
// aspectos destacados y CSV. Segura para el cliente y probada con vitest.
import { APP_TIMEZONE } from '@/utils/locale';

export const PERIODS = [7, 30, 90] as const;
export type PeriodDays = (typeof PERIODS)[number];

/** "?periodo=30" → 30. Cualquier otra cosa → 7 (el periodo por defecto). */
export function parsePeriod(raw: string | undefined | null): PeriodDays {
  const n = Number(raw);
  return (PERIODS as readonly number[]).includes(n) ? (n as PeriodDays) : 7;
}

const ymd = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: APP_TIMEZONE }).format(d);
const DAY = 86_400_000;
/** Mediodía UTC de una fecha local: sumar o restar días nunca cambia de fecha por el horario. */
const noon = (iso: string) => new Date(`${iso}T12:00:00Z`);
const addDays = (iso: string, n: number) => ymd(new Date(noon(iso).getTime() + n * DAY));

export interface PeriodRange { days: PeriodDays; from: string; to: string; prevFrom: string; prevTo: string }

/** Periodo actual (incluye hoy) y el anterior del mismo largo, en fechas de República Dominicana. */
export function periodRange(days: PeriodDays, now: Date = new Date()): PeriodRange {
  const to = ymd(now);
  const from = addDays(to, -(days - 1));
  return { days, from, to, prevTo: addDays(from, -1), prevFrom: addDays(from, -days) };
}

export interface SeriesPoint { label: string; from: string; to: string; received: number; resolved: number }

/** Tramos del gráfico: un punto por día en 7 días; por semana en 30 y 90 (5 y 13 puntos). */
export function buckets(range: Pick<PeriodRange, 'from' | 'to' | 'days'>): { from: string; to: string; label: string }[] {
  const step = range.days === 7 ? 1 : 7;
  const out: { from: string; to: string; label: string }[] = [];
  // Se arma hacia atrás desde hoy: el último tramo siempre termina hoy
  for (let end = range.to; end >= range.from; end = addDays(end, -step)) {
    const start = step === 1 ? end : [addDays(end, -(step - 1)), range.from].sort().at(-1)!;
    out.unshift({ from: start, to: end, label: step === 1 ? weekdayLabel(end) : shortDate(start) });
  }
  return out;
}

const weekday = new Intl.DateTimeFormat('es-DO', { timeZone: 'UTC', weekday: 'short' });
const shortFmt = new Intl.DateTimeFormat('es-DO', { timeZone: 'UTC', day: 'numeric', month: 'short' });
const weekdayLabel = (iso: string) => weekday.format(noon(iso)).replace('.', '').toUpperCase();
const shortDate = (iso: string) => shortFmt.format(noon(iso)).replace('.', '');

/** Cuenta cada fecha (timestamptz) en su tramo, según el día local de Santo Domingo. */
export function buildSeries(range: Pick<PeriodRange, 'from' | 'to' | 'days'>, received: string[], resolved: string[]): SeriesPoint[] {
  const bs = buckets(range).map((b) => ({ ...b, received: 0, resolved: 0 }));
  const place = (ts: string, key: 'received' | 'resolved') => {
    const day = ymd(new Date(ts));
    const b = bs.find((x) => day >= x.from && day <= x.to);
    if (b) b[key]++;
  };
  received.forEach((t) => place(t, 'received'));
  resolved.forEach((t) => place(t, 'resolved'));
  return bs;
}

export type Direction = 'up' | 'down' | 'same';
export interface Delta { pct: number | null; direction: Direction; good: boolean | null; text: string }

/**
 * Cambio frente al periodo anterior. `higherIsBetter`: más resueltos es bueno; más abiertos es malo.
 * Sin base (anterior = 0) no hay porcentaje: "nuevo" si hay algo, "igual" si sigue en cero.
 */
export function delta(current: number, previous: number, higherIsBetter: boolean): Delta {
  if (current === previous) return { pct: 0, direction: 'same', good: null, text: 'igual que antes' };
  const direction: Direction = current > previous ? 'up' : 'down';
  const good = direction === 'up' ? higherIsBetter : !higherIsBetter;
  if (previous === 0) return { pct: null, direction, good, text: 'nuevo en este periodo' };
  const pct = Math.round(((current - previous) / previous) * 100);
  return { pct, direction, good, text: `${direction === 'up' ? 'subió' : 'bajó'} ${Math.abs(pct)} %` };
}

/** Horas → "45 min", "3 h 20 min", "2 d 5 h". */
export function formatHours(hours: number | null | undefined) {
  if (hours == null || !Number.isFinite(hours)) return '—';
  const min = Math.round(hours * 60);
  if (min < 60) return `${Math.max(1, min)} min`;
  if (min < 48 * 60) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m ? `${h} h ${m} min` : `${h} h`;
  }
  const d = Math.floor(min / 1440);
  const h = Math.round((min % 1440) / 60);
  return h ? `${d} d ${h} h` : `${d} d`;
}

/** Tiempo de espera desde una fecha: "3 d 4 h". */
export const waitingSince = (iso: string, now: Date = new Date()) => formatHours((now.getTime() - new Date(iso).getTime()) / 3_600_000);

export interface InsightInput {
  days: number;
  received: number;
  receivedPrev: number;
  resolved: number;
  openNow: number;
  oldestPendingHours: number | null;
  topTrafficType: { label: string; count: number } | null;
  topMunicipality: { name: string; share: number } | null;
  topViewed: { name: string; views: number } | null;
}

/** Aspectos destacados en frases cortas, generados de los datos del periodo (como en la UASD). */
export function insights(i: InsightInput): string[] {
  const out: string[] = [];
  const d = delta(i.received, i.receivedPrev, false);
  const n = `${i.received} ${i.received === 1 ? 'reporte' : 'reportes'}`;
  if (i.received === 0) out.push(`No llegaron reportes en los últimos ${i.days} días.`);
  else if (d.pct !== null && d.direction !== 'same') out.push(`${i.received === 1 ? 'Llegó' : 'Llegaron'} ${n}: ${Math.abs(d.pct)} % ${d.direction === 'up' ? 'más' : 'menos'} que en los ${i.days} días anteriores.`);
  else out.push(`${i.received === 1 ? 'Llegó' : 'Llegaron'} ${n} en los últimos ${i.days} días.`);
  if (i.resolved > 0) out.push(`El municipio resolvió ${i.resolved} ${i.resolved === 1 ? 'reporte' : 'reportes'} en este periodo.`);
  if (i.oldestPendingHours != null && i.oldestPendingHours >= 72) out.push(`Hay un reporte esperando respuesta desde hace ${formatHours(i.oldestPendingHours)}.`);
  else if (i.openNow === 0) out.push('No hay reportes al municipio sin resolver.');
  if (i.topTrafficType && i.topTrafficType.count > 0) out.push(`La alerta vial más común fue «${i.topTrafficType.label}» (${i.topTrafficType.count}).`);
  if (i.topMunicipality && i.topMunicipality.share >= 0.5) out.push(`${i.topMunicipality.name} concentra el ${Math.round(i.topMunicipality.share * 100)} % de los reportes.`);
  if (i.topViewed && i.topViewed.views > 0) out.push(`La ficha más vista fue ${i.topViewed.name}, con ${i.topViewed.views} ${i.topViewed.views === 1 ? 'visita' : 'visitas'}.`);
  return out;
}

/** CSV con separador ";" y BOM: Excel en español lo abre bien, con tildes. */
export function toCsv(rows: (string | number | null)[][]) {
  const cell = (v: string | number | null) => {
    const s = v == null ? '' : String(v);
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return '﻿' + rows.map((r) => r.map(cell).join(';')).join('\r\n');
}
