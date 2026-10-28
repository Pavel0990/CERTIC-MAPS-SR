import { describe, expect, it } from 'vitest';
import type { WeeklyKpis, WeeklyReportData } from '../index';
import { periodLabel, weeklyHighlights } from './document';

describe('periodLabel', () => {
  it('no repite el mes ni el año cuando no hace falta', () => {
    expect(periodLabel('2026-09-21', '2026-09-27')).toBe('21 – 27 de septiembre de 2026');
    expect(periodLabel('2026-09-28', '2026-10-04')).toBe('28 de septiembre – 4 de octubre de 2026');
    expect(periodLabel('2026-12-28', '2027-01-03')).toBe('28 de diciembre de 2026 – 3 de enero de 2027');
  });
});

const kpis = (traffic: number, requests: number, byType: Record<string, number> = {}): WeeklyKpis => ({
  traffic: { received: traffic, published: 0, rejected: 0, out_of_area: 0, by_type: byType },
  requests: { received: requests, resolved: 2, rejected: 0, open_now: 1, avg_resolution_hours: null, top_supported: [] },
  businesses: { approved_total: 0, submitted: 0, pending_now: 0 },
  tourism: { places_published: 0, routes_published: 0, proposals_pending: 0 },
  users: { new: 0 },
  engagement: { views: 0 },
});

const report = (snapshots: WeeklyReportData['snapshots']): WeeklyReportData => ({
  run_id: 'r', period_start: '2026-10-19', period_end: '2026-10-25', version: 1, trigger: 'cron',
  province_code: 'SR', province_name: 'Santiago Rodríguez', snapshots, traffic_types: { bache: 'Bache' },
});

describe('weeklyHighlights', () => {
  it('resume la semana con las reglas del panel, sin inventar la comparación con la semana anterior', () => {
    const h = weeklyHighlights(report([
      { municipality_id: null, municipality_name: null, metrics: kpis(6, 4, { bache: 5 }) },
      { municipality_id: 'a', municipality_name: 'San Ignacio de Sabaneta', metrics: kpis(5, 3) },
      { municipality_id: 'b', municipality_name: 'Monción', metrics: kpis(1, 1) },
    ]));
    expect(h).toEqual([
      'Llegaron 10 reportes en la semana del 19 – 25 de octubre de 2026.',
      'El municipio resolvió 2 reportes en este periodo.',
      'La alerta vial más común fue «Bache» (5).',
      'Sabaneta concentra el 80 % de los reportes.',
    ]);
  });

  it('sin snapshot provincial no hay frases', () => {
    expect(weeklyHighlights(report([]))).toEqual([]);
  });
});

describe('WeeklyReportDocument', () => {
  it('genera un PDF válido con los aspectos destacados', async () => {
    const { renderToBuffer } = await import('@react-pdf/renderer');
    const { WeeklyReportDocument } = await import('./document');
    const data = report([
      { municipality_id: null, municipality_name: null, metrics: kpis(6, 4, { bache: 5 }) },
      { municipality_id: 'a', municipality_name: 'San Ignacio de Sabaneta', metrics: kpis(5, 3) },
    ]);
    const pdf = await renderToBuffer(<WeeklyReportDocument data={data} generatedAt={new Date('2026-10-26T12:00:00Z')} />);
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
  }, 20_000);
});
