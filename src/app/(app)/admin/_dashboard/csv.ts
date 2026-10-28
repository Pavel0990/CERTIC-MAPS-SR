import type { Dashboard } from '@/modules/admin/server';

/** Filas del CSV de "Descargar" (toCsv las convierte): el periodo frente al anterior y el detalle de cada bloque. */
export function csvRows(d: Dashboard, territory: string, trafficTypes: Record<string, string>) {
  const k = d.kpis;
  const p = d.prev;
  const rows: (string | number | null)[][] = [
    ['SR Conecta · Indicadores', territory],
    ['Periodo', `${d.range.from} a ${d.range.to}`, 'Periodo anterior', `${d.range.prevFrom} a ${d.range.prevTo}`],
    [],
    ['Indicador', 'Periodo', 'Periodo anterior'],
    ['Reportes recibidos', k.traffic.received + k.requests.received, p.traffic.received + p.requests.received],
    ['Alertas de tránsito', k.traffic.received, p.traffic.received],
    ['Reportes al municipio', k.requests.received, p.requests.received],
    ['Resueltos', k.requests.resolved, p.requests.resolved],
    ['Descartados', k.requests.rejected, p.requests.rejected],
    ['Abiertos hoy', k.requests.open_now, null],
    ['Horas promedio para resolver', k.requests.avg_resolution_hours == null ? null : Math.round(k.requests.avg_resolution_hours * 10) / 10, p.requests.avg_resolution_hours == null ? null : Math.round(p.requests.avg_resolution_hours * 10) / 10],
    ['Personas nuevas', k.users.new, p.users.new],
    ['Visitas a fichas (toda la provincia)', k.engagement.views, p.engagement.views],
    [],
    ['Tramo', 'Recibidos', 'Resueltos'],
    ...d.series.map((s) => [`${s.from} a ${s.to}`, s.received, s.resolved]),
    [],
    ['Tipo de alerta', 'Cantidad'],
    ...Object.entries(k.traffic.by_type).map(([t, n]) => [trafficTypes[t] ?? t, n]),
  ];
  if (d.byMunicipality) rows.push([], ['Municipio', 'Recibidos', 'Resueltos', 'Abiertos'], ...d.byMunicipality.map((m) => [m.name, m.received, m.resolved, m.openNow]));
  if (d.topViewed.length) rows.push([], ['Ficha', 'Visitas', 'Cómo llegar', 'WhatsApp'], ...d.topViewed.map((v) => [v.name, v.views, v.directions, v.whatsapp]));
  return rows;
}
