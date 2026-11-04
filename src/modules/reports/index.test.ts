import { describe, expect, it } from 'vitest';
import { closedWeeks, isoWeek, reportPath } from './index';

describe('semanas del informe', () => {
  it('numera semanas ISO, también en el cambio de año', () => {
    expect(isoWeek('2026-09-28')).toEqual({ year: 2026, week: 40 });
    expect(isoWeek('2026-12-28')).toEqual({ year: 2026, week: 53 });
    expect(isoWeek('2027-01-04')).toEqual({ year: 2027, week: 1 });
    expect(isoWeek('2024-12-30')).toEqual({ year: 2025, week: 1 }); // lunes de la semana 1 de 2025
  });

  it('arma la ruta del PDF con semana de dos cifras y versión', () => {
    expect(reportPath('sr', '2026-01-05', 3)).toBe('sr/2026/semana-02/v3.pdf');
    expect(reportPath('sr', '2026-09-28', 1)).toMatch(/^[a-z0-9/_.-]+\.pdf$/); // CHECK de report_runs.storage_path
  });

  it('solo ofrece semanas ya cerradas, en hora de República Dominicana', () => {
    // jueves 1 oct 2026, 12:00 en RD → la última semana cerrada empezó el lunes 21 sep
    expect(closedWeeks(new Date('2026-10-01T16:00:00Z'), 2)).toEqual(['2026-09-21', '2026-09-14']);
    // lunes 28 sep, 01:00 UTC = domingo 27, 21:00 en RD: la semana del 21 todavía no ha terminado
    expect(closedWeeks(new Date('2026-09-28T01:00:00Z'), 1)).toEqual(['2026-09-14']);
    // lunes 28 sep, 05:00 UTC = 01:00 en RD: ya cerró
    expect(closedWeeks(new Date('2026-09-28T05:00:00Z'), 1)).toEqual(['2026-09-21']);
  });
});
