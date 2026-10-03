import { describe, expect, it } from 'vitest';
import { periodLabel } from './document';

describe('periodLabel', () => {
  it('no repite el mes ni el año cuando no hace falta', () => {
    expect(periodLabel('2026-09-21', '2026-09-27')).toBe('21 – 27 de septiembre de 2026');
    expect(periodLabel('2026-09-28', '2026-10-04')).toBe('28 de septiembre – 4 de octubre de 2026');
    expect(periodLabel('2026-12-28', '2027-01-03')).toBe('28 de diciembre de 2026 – 3 de enero de 2027');
  });
});
