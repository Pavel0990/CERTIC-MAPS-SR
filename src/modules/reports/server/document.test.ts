import { describe, expect, it } from 'vitest';
import { periodLabel } from './document';

describe('periodLabel', () => {
  it('no repite el mes ni el año cuando no hace falta', () => {
    expect(periodLabel('2026-09-21', '2026-09-27')).toBe('21 – 27 de septiembre de 2026');
    expect(periodLabel('2026-09-28', '2026-10-04')).toBe('28 de septiembre – 4 de octubre de 2026');
    expect(periodLabel('2026-12-28', '2027-01-03')).toBe('28 de diciembre de 2026 – 3 de enero de 2027');
  });
});

describe('WeeklyReportDocument', () => {
  it('genera un PDF válido con «Lo más importante de la semana»', async () => {
    const { createElement } = await import('react');
    const { renderToBuffer } = await import('@react-pdf/renderer');
    const { WeeklyReportDocument } = await import('./document');
    const metrics = {
      traffic: { received: 8, published: 6, rejected: 1, out_of_area: 0, by_type: { bache: 5, accidente: 3 } },
      requests: { received: 6, resolved: 2, rejected: 0, open_now: 4, avg_resolution_hours: 30, top_supported: [{ id: 'a', title: 'Arreglar el puente', support_count: 9 }] },
      businesses: { approved_total: 84, submitted: 2, pending_now: 2 },
      tourism: { places_published: 21, routes_published: 3, proposals_pending: 1 },
      users: { new: 3 },
      engagement: { views: 140 },
    };
    const data = {
      run_id: 'r', period_start: '2026-10-19', period_end: '2026-10-25', version: 1, trigger: 'cron' as const,
      province_code: 'SR', province_name: 'Santiago Rodríguez',
      snapshots: [{ municipality_id: null, municipality_name: null, metrics }, { municipality_id: 'm', municipality_name: 'Monción', metrics }],
      traffic_types: { bache: 'Bache', accidente: 'Accidente' },
    };
    const pdf = await renderToBuffer(createElement(WeeklyReportDocument, { data, generatedAt: new Date('2026-10-26T14:00:00Z') }) as Parameters<typeof renderToBuffer>[0]);
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(pdf.length).toBeGreaterThan(3000);
  }, 30_000);
});
