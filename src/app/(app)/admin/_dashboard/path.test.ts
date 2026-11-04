import { describe, expect, it } from 'vitest';
import { monotonePath } from './path';

/** Todos los puntos de control de los tramos C del trazado. */
const controls = (d: string) => [...d.matchAll(/C([\d.-]+),([\d.-]+) ([\d.-]+),([\d.-]+) ([\d.-]+),([\d.-]+)/g)].map((m) => m.slice(1).map(Number));

describe('curva del gráfico', () => {
  it('pasa por cada punto', () => {
    const d = monotonePath([[0, 100], [10, 20], [20, 60]]);
    expect(d.startsWith('M0,100')).toBe(true);
    expect(d).toContain(' 10,20 C');
    expect(d.endsWith(' 20,60')).toBe(true);
  });
  it('no se pasa de los datos: entre dos tramos iguales queda plana, sin pico inventado', () => {
    const d = monotonePath([[0, 100], [10, 20], [20, 20], [30, 100]]);
    for (const [, y1, , y2, , y] of controls(d)) {
      for (const v of [y1!, y2!, y!]) expect(v).toBeGreaterThanOrEqual(20);
    }
  });
  it('casos borde: sin puntos o con uno solo', () => {
    expect(monotonePath([])).toBe('');
    expect(monotonePath([[5, 5]])).toBe('M5,5');
  });
});
