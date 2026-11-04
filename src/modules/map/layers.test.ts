import { describe, expect, it } from 'vitest';
import { clampBBox, containsBBox, snapBBox } from './layers';

describe('rejilla del viewport', () => {
  it('redondea hacia afuera a 0,01°', () => {
    expect(snapBBox({ minLng: -71.3456, minLat: 19.4712, maxLng: -71.3301, maxLat: 19.4801 })).toEqual({
      minLng: -71.35, minLat: 19.47, maxLng: -71.33, maxLat: 19.49,
    });
  });
  it('un bbox contenido en otro no pide datos de nuevo', () => {
    const loaded = { minLng: -71.4, minLat: 19.4, maxLng: -71.3, maxLat: 19.5 };
    expect(containsBBox(loaded, { minLng: -71.38, minLat: 19.42, maxLng: -71.31, maxLat: 19.49 })).toBe(true);
    expect(containsBBox(loaded, { minLng: -71.45, minLat: 19.42, maxLng: -71.31, maxLat: 19.49 })).toBe(false);
  });
  it('recorta un bbox demasiado grande para el límite del SQL (2° por lado)', () => {
    const b = clampBBox({ minLng: -73, minLat: 18, maxLng: -69, maxLat: 21 });
    expect(b.maxLng - b.minLng).toBeLessThanOrEqual(2);
    expect(b.maxLat - b.minLat).toBeLessThanOrEqual(2);
    expect((b.minLng + b.maxLng) / 2).toBeCloseTo(-71);
  });
});
