// API pública del módulo "traffic" (segura para el cliente).
// Reportes de tránsito: creación, moderación, vencimiento, escalado y tiempo real (F4).
export { useLiveTraffic, isLiveStatus, type TrafficBroadcast } from './hooks/use-live-traffic';
export { trafficReportInput, type TrafficReportInput } from './schemas';
