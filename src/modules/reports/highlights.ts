import type { WeeklyReportData } from './index';

// «Lo más importante de la semana»: frases cortas generadas de la foto fija del informe (rúbrica:
// automatización). Reglas fijas, sin IA de pago: los mismos datos dan siempre el mismo texto, y cada
// frase se puede comprobar contra las tablas del propio PDF. Lo que pide acción va primero.

const MAX = 6;
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const pct = (part: number, total: number) => Math.round((part / total) * 100);

/** Horas legibles: «18 horas», «2,5 días». */
export function spokenHours(h: number) {
  if (h < 48) return plural(Math.round(h), 'hora', 'horas');
  const d = Math.round((h / 24) * 10) / 10;
  return `${String(d).replace('.', ',')} días`;
}

export function weeklyHighlights(data: Pick<WeeklyReportData, 'snapshots' | 'traffic_types'>): string[] {
  const k = data.snapshots.find((x) => x.municipality_id === null)?.metrics;
  if (!k) return [];
  const munis = data.snapshots.filter((x) => x.municipality_id !== null && x.municipality_name);
  const out: { weight: number; text: string }[] = [];

  // Actividad de los vecinos
  const traffic = k.traffic.received;
  const requests = k.requests.received;
  if (traffic + requests === 0) out.push({ weight: 50, text: 'Semana tranquila: no llegaron alertas de tránsito ni reportes de los vecinos.' });
  else out.push({ weight: 50, text: `Los vecinos enviaron ${plural(traffic, 'alerta de tránsito', 'alertas de tránsito')} y ${plural(requests, 'reporte o consulta', 'reportes o consultas')}.` });

  // Respuesta del municipio
  if (k.requests.resolved > 0) {
    const avg = k.requests.avg_resolution_hours;
    out.push({ weight: 60, text: `El municipio resolvió ${plural(k.requests.resolved, 'consulta', 'consultas')}${avg != null ? `, en un tiempo medio de ${spokenHours(avg)}` : ''}.` });
  } else if (k.requests.open_now > 0) {
    out.push({ weight: 85, text: `No se resolvió ninguna consulta esta semana y ${k.requests.open_now === 1 ? 'queda 1 abierta' : `quedan ${k.requests.open_now} abiertas`}.` });
  }

  // Dónde hace falta atención: el municipio con más consultas abiertas
  const mostOpen = [...munis].sort((a, b) => b.metrics.requests.open_now - a.metrics.requests.open_now)[0];
  if (mostOpen && mostOpen.metrics.requests.open_now >= 3) {
    out.push({ weight: 80, text: `${mostOpen.municipality_name} tiene la mayor cantidad de consultas abiertas (${mostOpen.metrics.requests.open_now}).` });
  }

  // Lo que espera revisión en el panel
  const pendingBiz = k.businesses.pending_now;
  const pendingProps = k.tourism.proposals_pending;
  if (pendingBiz + pendingProps > 0) {
    const parts = [pendingBiz > 0 && plural(pendingBiz, 'negocio', 'negocios'), pendingProps > 0 && plural(pendingProps, 'propuesta de lugar o ruta', 'propuestas de lugares o rutas')].filter(Boolean);
    out.push({ weight: 75, text: `${pendingBiz + pendingProps === 1 ? 'Espera' : 'Esperan'} revisión en el panel: ${parts.join(' y ')}.` });
  }

  // Lo que más piden los vecinos
  const top = k.requests.top_supported[0];
  if (top && top.support_count > 0) {
    out.push({ weight: 70, text: `La prioridad más apoyada por los vecinos: «${top.title}» (${plural(top.support_count, 'apoyo', 'apoyos')}).` });
  }

  // Tránsito: el tipo más común
  const types = Object.entries(k.traffic.by_type).sort((a, b) => b[1] - a[1]);
  const [topType] = types;
  if (topType && topType[1] > 0) {
    const label = data.traffic_types[topType[0]] ?? topType[0];
    out.push({ weight: 55, text: `La alerta vial más común fue «${label}» (${traffic >= 3 ? `${topType[1]} de ${traffic}` : topType[1]}).` });
  }

  // Concentración por municipio (con poca actividad el porcentaje no dice nada)
  const activity = munis.map((m) => ({ name: m.municipality_name!, n: m.metrics.traffic.received + m.metrics.requests.received }));
  const totalActivity = activity.reduce((a, b) => a + b.n, 0);
  const busiest = [...activity].sort((a, b) => b.n - a.n)[0];
  if (busiest && totalActivity >= 4 && busiest.n / totalActivity >= 0.5) {
    out.push({ weight: 45, text: `${busiest.name} concentró el ${pct(busiest.n, totalActivity)} % de la actividad de los vecinos.` });
  }

  // Calidad de los reportes: muchas alertas rechazadas pueden indicar que la app no se entiende
  if (traffic >= 5 && k.traffic.rejected / traffic >= 0.3) {
    out.push({ weight: 65, text: `La moderación rechazó ${k.traffic.rejected} de ${traffic} alertas: conviene revisar si los vecinos entienden cómo reportar.` });
  }

  // Alcance
  const views = k.engagement.views;
  const newUsers = k.users.new;
  if (views > 0 || newUsers > 0) {
    const parts = [views > 0 && `las fichas recibieron ${plural(views, 'visita', 'visitas')}`, newUsers > 0 && `se sumaron ${plural(newUsers, 'persona nueva', 'personas nuevas')}`].filter(Boolean) as string[];
    const sentence = parts.join(' y ');
    out.push({ weight: 40, text: `${sentence.charAt(0).toUpperCase()}${sentence.slice(1)}.` });
  }

  return out
    .map((x, i) => ({ ...x, i }))
    .sort((a, b) => b.weight - a.weight || a.i - b.i)
    .slice(0, MAX)
    .map((x) => x.text);
}
