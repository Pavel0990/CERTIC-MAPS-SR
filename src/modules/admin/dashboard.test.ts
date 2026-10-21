import { describe, expect, it } from 'vitest';
import { buckets, buildSeries, delta, formatHours, insights, parsePeriod, periodRange, toCsv } from './dashboard';

// 21/10/2026 a las 10:00 en Santo Domingo (UTC−4)
const NOW = new Date('2026-10-21T14:00:00Z');

describe('periodo', () => {
  it('solo 7, 30 o 90; lo demás es 7', () => {
    expect(parsePeriod('30')).toBe(30);
    expect(parsePeriod('90')).toBe(90);
    expect(parsePeriod('15')).toBe(7);
    expect(parsePeriod(undefined)).toBe(7);
    expect(parsePeriod('abc')).toBe(7);
  });

  it('incluye hoy, y el anterior es del mismo largo y sin solaparse', () => {
    expect(periodRange(7, NOW)).toEqual({ days: 7, from: '2026-10-15', to: '2026-10-21', prevFrom: '2026-10-08', prevTo: '2026-10-14' });
    const r30 = periodRange(30, NOW);
    expect(r30.from).toBe('2026-09-22');
    expect(r30.prevTo).toBe('2026-09-21');
  });

  it('a las 11 p. m. de RD (ya es otro día en UTC) sigue contando el día local', () => {
    expect(periodRange(7, new Date('2026-10-22T03:00:00Z')).to).toBe('2026-10-21');
  });
});

describe('tramos del gráfico', () => {
  it('7 días: un punto por día, el último es hoy', () => {
    const b = buckets(periodRange(7, NOW));
    expect(b).toHaveLength(7);
    expect(b.at(-1)).toMatchObject({ from: '2026-10-21', to: '2026-10-21' });
    expect(b[0]).toMatchObject({ from: '2026-10-15' });
  });

  it('30 y 90 días: por semana, cubriendo todo el periodo sin huecos', () => {
    for (const days of [30, 90] as const) {
      const r = periodRange(days, NOW);
      const b = buckets(r);
      expect(b[0]!.from).toBe(r.from);
      expect(b.at(-1)!.to).toBe(r.to);
      expect(b.length).toBe(Math.ceil(days / 7));
    }
  });

  it('cada fecha cae en su día local y la suma cuadra con el total', () => {
    const r = periodRange(7, NOW);
    const received = ['2026-10-21T13:00:00Z', '2026-10-21T03:30:00Z', '2026-10-15T05:00:00Z', '2026-10-01T12:00:00Z'];
    const s = buildSeries(r, received, ['2026-10-20T15:00:00Z']);
    expect(s.at(-1)!.received).toBe(1); // 21/10 9 a. m. RD
    expect(s.at(-2)!.received).toBe(1); // 20/10 11:30 p. m. RD
    expect(s.at(-2)!.resolved).toBe(1);
    expect(s[0]!.received).toBe(1); // 15/10 1 a. m. RD
    expect(s.reduce((n, p) => n + p.received, 0)).toBe(3); // la del 1/10 queda fuera
  });
});

describe('comparación con el periodo anterior', () => {
  it('más resueltos es bueno; más abiertos es malo', () => {
    expect(delta(15, 10, true)).toMatchObject({ pct: 50, direction: 'up', good: true });
    expect(delta(15, 10, false)).toMatchObject({ pct: 50, direction: 'up', good: false });
    expect(delta(5, 10, false)).toMatchObject({ pct: -50, direction: 'down', good: true });
  });
  it('sin base no inventa porcentajes', () => {
    expect(delta(3, 0, true)).toMatchObject({ pct: null, text: 'nuevo en este periodo' });
    expect(delta(0, 0, true)).toMatchObject({ direction: 'same', good: null });
  });
});

describe('tiempos legibles', () => {
  it('minutos, horas y días', () => {
    expect(formatHours(0.25)).toBe('15 min');
    expect(formatHours(3 + 20 / 60)).toBe('3 h 20 min');
    expect(formatHours(5)).toBe('5 h');
    expect(formatHours(53)).toBe('2 d 5 h');
    expect(formatHours(null)).toBe('—');
  });
});

describe('aspectos destacados', () => {
  it('frases cortas y solo lo que tiene datos', () => {
    const out = insights({
      days: 7, received: 12, receivedPrev: 8, resolved: 3, openNow: 4, oldestPendingHours: 80,
      topTrafficType: { label: 'Bache', count: 5 }, topMunicipality: { name: 'Monción', share: 0.6 }, topViewed: { name: 'Presa de Monción', views: 40 },
    });
    expect(out[0]).toBe('Llegaron 12 reportes: 50 % más que en los 7 días anteriores.');
    expect(out).toContain('Hay un reporte esperando respuesta desde hace 3 d 8 h.');
    expect(out).toContain('Monción concentra el 60 % de los reportes.');
    expect(out.some((s) => s.includes('Presa de Monción'))).toBe(true);
  });
  it('singular', () => {
    const out = insights({ days: 7, received: 1, receivedPrev: 1, resolved: 0, openNow: 0, oldestPendingHours: null, topTrafficType: null, topMunicipality: null, topViewed: null });
    expect(out[0]).toBe('Llegó 1 reporte en los últimos 7 días.');
  });
  it('periodo vacío', () => {
    const out = insights({ days: 30, received: 0, receivedPrev: 0, resolved: 0, openNow: 0, oldestPendingHours: null, topTrafficType: null, topMunicipality: null, topViewed: null });
    expect(out).toEqual(['No llegaron reportes en los últimos 30 días.', 'No hay reportes al municipio sin resolver.']);
  });
});

describe('CSV', () => {
  it('separador ;, BOM y comillas cuando hace falta', () => {
    expect(toCsv([['Indicador', 'Valor'], ['Abiertos; ahora', 3], ['Dice "hola"', null]])).toBe('﻿Indicador;Valor\r\n"Abiertos; ahora";3\r\n"Dice ""hola""";');
  });
});
