import 'server-only';
import { renderToBuffer } from '@react-pdf/renderer';
import { PermanentJobError, type JobHandlers } from '@/modules/jobs';
import type { ServiceSupabase } from '@/lib/supabase/admin';
import { reportPath, type WeeklyReportData } from '../index';
import { WeeklyReportDocument } from './document';

const BUCKET = 'reports-pdf';
const MAX_ATTEMPTS = 5; // igual que private.jobs.max_attempts por defecto

export type WeeklyRunResult =
  | { status: 'ok'; run_id: string; path: string; bytes: number }
  | { status: 'skipped'; reason: string }
  | { status: 'failed'; run_id: string; error: string };

/** Renderiza el PDF de una ejecución en curso, lo sube y la cierra (notifica a la administración). */
async function renderAndStore(supabase: ServiceSupabase, runId: string) {
  const { data, error } = await supabase.rpc('worker_report_run', { p_run_id: runId });
  if (error) throw new Error(`worker_report_run: ${error.message}`);
  const run = data as unknown as WeeklyReportData | null;
  if (!run) return null; // ya terminada (otra ejecución ganó la carrera)

  const pdf = await renderToBuffer(<WeeklyReportDocument data={run} generatedAt={new Date()} />);
  const path = reportPath(run.province_code, run.period_start, run.version);
  const up = await supabase.storage.from(BUCKET).upload(path, pdf, { contentType: 'application/pdf', upsert: true });
  if (up.error) throw new Error(`subida ${path}: ${up.error.message}`);

  const fin = await supabase.rpc('weekly_report_finish', { p_run_id: runId, p_ok: true, p_storage_path: path });
  if (fin.error) throw new Error(`weekly_report_finish: ${fin.error.message}`);
  return { path, bytes: pdf.length };
}

async function markFailed(supabase: ServiceSupabase, runId: string, message: string) {
  const { error } = await supabase.rpc('weekly_report_finish', { p_run_id: runId, p_ok: false, p_error: message });
  if (error) console.error(`[informe] no se pudo marcar el fallo de ${runId}: ${error.message}`);
}

/**
 * Chequeo diario del cron (ADR-014): genera el informe de la semana anterior si falta.
 * weekly_report_begin es idempotente: 6 de cada 7 días devuelve 'skipped'. Un fallo queda 'failed'
 * y el cron del día siguiente lo retoma (hasta 5 intentos).
 */
export async function runWeeklyReport(supabase: ServiceSupabase): Promise<WeeklyRunResult> {
  const { data, error } = await supabase.rpc('weekly_report_begin', {});
  if (error) throw new Error(`weekly_report_begin: ${error.message}`);
  const begin = data as unknown as { status: string; run_id?: string; reason?: string };
  if (begin.status !== 'ok' || !begin.run_id) return { status: 'skipped', reason: begin.reason ?? begin.status };

  try {
    const out = await renderAndStore(supabase, begin.run_id);
    if (!out) return { status: 'skipped', reason: 'already_finished' };
    return { status: 'ok', run_id: begin.run_id, ...out };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await markFailed(supabase, begin.run_id, message);
    return { status: 'failed', run_id: begin.run_id, error: message };
  }
}

/** "Generar ahora" (request_weekly_report) llega por la cola: el worker renderiza con reintentos. */
export function reportJobHandlers(supabase: ServiceSupabase): JobHandlers {
  return {
    async pdf_weekly(job) {
      const runId = job.payload.run_id;
      if (typeof runId !== 'string') throw new PermanentJobError('payload sin run_id');
      try {
        await renderAndStore(supabase, runId);
      } catch (e) {
        // Último intento: la ejecución queda 'failed' para que el panel lo muestre
        if (job.attempts >= MAX_ATTEMPTS) await markFailed(supabase, runId, e instanceof Error ? e.message : String(e));
        throw e;
      }
    },
  };
}
