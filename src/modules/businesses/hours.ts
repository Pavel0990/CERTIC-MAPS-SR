// Horario de un negocio: "abierto ahora" y texto legible. La hora es la de República Dominicana.
import { APP_TIMEZONE as TZ } from '@/utils/locale';

export interface HourRange { weekday: number; opens: string; closes: string }

const parts = new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
const DOW: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
const toMin = (t: string) => {
  const [h = 0, m = 0] = t.split(':').map(Number);
  return h * 60 + m;
};

/** Día de la semana (0 = domingo) y minuto del día en Santo Domingo. */
export function localNow(now: Date = new Date()) {
  const p = Object.fromEntries(parts.formatToParts(now).map((x) => [x.type, x.value]));
  return { weekday: DOW[p.weekday ?? 'Sun'] ?? 0, minutes: Number(p.hour) * 60 + Number(p.minute) };
}

/** Fecha de hoy (AAAA-MM-DD) en Santo Domingo. */
export function localToday(now: Date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(now);
}

/**
 * Primer día en que puede empezar una promoción: hoy en RD. create_promotion compara con la misma
 * fecha (private.local_today(), migración 290), así que también vale de 8 p. m. a medianoche.
 */
export function promotionStartMin(now: Date = new Date()) {
  return localToday(now);
}

/**
 * ¿Está abierto en este momento? Un rango que cierra antes de abrir (22:00–02:00) sigue
 * abierto la madrugada del día siguiente, igual que en la base de datos.
 */
export function isOpenNow(hours: HourRange[], now: Date = new Date()) {
  const { weekday, minutes } = localNow(now);
  const yesterday = (weekday + 6) % 7;
  return hours.some((h) => {
    const o = toMin(h.opens);
    const c = toMin(h.closes);
    if (o < c) return h.weekday === weekday && minutes >= o && minutes < c;
    return (h.weekday === weekday && minutes >= o) || (h.weekday === yesterday && minutes < c);
  });
}

/** "8:00 a. m." a partir de "08:00". */
export function formatTime(t: string) {
  const min = toMin(t);
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'a. m.' : 'p. m.'}`;
}

/** Rangos de cada día de la semana, de domingo a sábado, ordenados por hora de apertura. */
export function hoursByDay(hours: HourRange[]) {
  return Array.from({ length: 7 }, (_, d) =>
    hours.filter((h) => h.weekday === d).sort((a, b) => toMin(a.opens) - toMin(b.opens)),
  );
}
