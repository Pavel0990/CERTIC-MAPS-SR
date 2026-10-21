import { describe, expect, it } from 'vitest';
import { initials } from './avatar';

describe('iniciales del avatar', () => {
  it('primera y última palabra', () => {
    expect(initials('Ana María Pérez')).toBe('AP');
    expect(initials('  pavel  ')).toBe('P');
    expect(initials('Ñoño Ángel')).toBe('ÑÁ');
    expect(initials('Ana Ciudadana (prueba)')).toBe('AC');
    expect(initials('José - Pérez')).toBe('JP');
  });
  it('sin nombre', () => {
    expect(initials('')).toBe('?');
    expect(initials('(prueba)')).toBe('?');
  });
});
