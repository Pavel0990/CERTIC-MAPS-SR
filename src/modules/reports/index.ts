// API pública del módulo "reports". Otros módulos y las páginas solo importan desde aquí (ADR-008).
// Informe semanal en PDF: generación, historial y descarga auditada (F6).

/** Salida de kpi_summary guardada en weekly_kpi_snapshots (misma forma que el panel). */
export interface WeeklyKpis {
  traffic: { received: number; published: number; rejected: number; out_of_area: number; by_type: Record<string, number> };
  requests: {
    received: number;
    resolved: number;
    rejected: number;
    open_now: number;
    avg_resolution_hours: number | null;
    top_supported: { id: string; title: string; support_count: number }[];
  };
  businesses: { approved_total: number; submitted: number; pending_now: number };
  tourism: { places_published: number; routes_published: number; proposals_pending: number };
  users: { new: number };
  engagement: { views: number };
}

/** Lo que devuelve worker_report_run: todo lo que necesita el PDF de una ejecución. */
export interface WeeklyReportData {
  run_id: string;
  period_start: string;
  period_end: string;
  version: number;
  trigger: 'cron' | 'manual';
  province_code: string;
  province_name: string;
  /** Primero la provincia (municipality_id null), luego cada municipio por nombre. */
  snapshots: { municipality_id: string | null; municipality_name: string | null; metrics: WeeklyKpis }[];
  traffic_types: Record<string, string>;
}

/** Ruta del PDF en el bucket privado reports-pdf (§9.6): {provincia}/{año}/semana-{nn}/v{n}.pdf */
export function reportPath(provinceCode: string, periodStart: string, version: number) {
  const { year, week } = isoWeek(periodStart);
  return `${provinceCode}/${year}/semana-${String(week).padStart(2, '0')}/v${version}.pdf`;
}

/** Año y número de semana ISO 8601 de una fecha civil (AAAA-MM-DD). */
export function isoWeek(date: string) {
  const d = new Date(`${date}T00:00:00Z`);
  const dow = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dow); // el jueves de esa semana decide el año
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1);
  return { year: d.getUTCFullYear(), week: Math.ceil(((d.getTime() - yearStart) / 86_400_000 + 1) / 7) };
}

/** Lunes de las últimas semanas cerradas (hora de RD), la más reciente primero: opciones de "Generar ahora". */
export function closedWeeks(now: Date, count = 8) {
  const local = new Date(now.toLocaleString('en-US', { timeZone: 'America/Santo_Domingo' }));
  const monday = new Date(Date.UTC(local.getFullYear(), local.getMonth(), local.getDate()));
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() || 7) - 1) - 7);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(monday);
    d.setUTCDate(d.getUTCDate() - 7 * i);
    return d.toISOString().slice(0, 10);
  });
}
