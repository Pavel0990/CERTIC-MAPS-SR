// Salida de la RPC kpi_summary (DATABASE.md §11): la MISMA forma alimenta el panel y el PDF semanal.
// Única definición: admin (panel) y reports (PDF) la importan desde aquí.
export interface KpiSummary {
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
