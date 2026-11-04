import { describe, expect, it } from 'vitest';
import { safeNext } from './safe-redirect';

describe('safeNext (sin open redirect)', () => {
  it('acepta rutas internas con query', () => {
    expect(safeNext('/actividad')).toBe('/actividad');
    expect(safeNext('/reportar?tipo=bache')).toBe('/reportar?tipo=bache');
  });
  it.each(['https://evil.com', '//evil.com', '/\\evil.com', 'javascript:alert(1)', '', null, undefined, 'actividad',
    '/..//evil.com', '/.//evil.com', '/a/..//evil.com', '/%2e%2e//evil.com', '/\t/evil.com'])('rechaza %s', (v) => {
    expect(safeNext(v as string)).toBe('/');
  });
});
