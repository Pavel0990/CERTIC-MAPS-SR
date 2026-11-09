// API de servidor del módulo "reports": informe semanal en PDF (§9.6, ADR-014).
import 'server-only';
export { runWeeklyReport, reportJobHandlers, type WeeklyRunResult } from './server/generate';
