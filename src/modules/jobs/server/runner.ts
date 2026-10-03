import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { PermanentJobError, type Job, type JobHandlers, type RunSummary } from '../index';

type ServiceClient = SupabaseClient<Database>;

export interface RunOptions {
  handlers: JobHandlers;
  /** Tiempo máximo de la ejecución; por debajo del maxDuration de la función serverless. */
  budgetMs?: number;
  batchSize?: number;
  /** Tiempo que un trabajo queda tomado; si el worker cae, otro lo retoma al vencer. */
  lockSeconds?: number;
}

/**
 * Vacía la cola mientras haya trabajo y tiempo (ADR-016).
 * Toma lotes con worker_claim_jobs (FOR UPDATE SKIP LOCKED): dos ejecuciones simultáneas nunca
 * procesan el mismo trabajo. Cada trabajo se cierra con worker_finish_job, que decide el reintento.
 */
export async function runJobs(supabase: ServiceClient, { handlers, budgetMs = 45_000, batchSize = 10, lockSeconds = 120 }: RunOptions): Promise<RunSummary> {
  const started = Date.now();
  const summary: RunSummary = { claimed: 0, done: 0, retried: 0, skipped: 0, ms: 0 };

  while (Date.now() - started < budgetMs) {
    const { data, error } = await supabase.rpc('worker_claim_jobs', { p_limit: batchSize, p_lock_seconds: lockSeconds });
    if (error) throw new Error(`worker_claim_jobs: ${error.message}`);
    const jobs = (data ?? []) as unknown as Job[];
    if (jobs.length === 0) break;
    summary.claimed += jobs.length;

    const results = await Promise.all(jobs.map((job) => runOne(supabase, handlers, job)));
    for (const r of results) summary[r] += 1;
  }

  summary.ms = Date.now() - started;
  return summary;
}

async function runOne(supabase: ServiceClient, handlers: JobHandlers, job: Job): Promise<'done' | 'retried' | 'skipped'> {
  const handler = handlers[job.kind];
  let ok = true;
  let message: string | null = null;
  let outcome: 'done' | 'retried' | 'skipped' = 'done';

  if (!handler) {
    // Tipo reservado sin consumidor todavía (p. ej. 'email'): se reintenta y acaba en 'dead', visible en la salud.
    ok = false;
    message = `sin handler para "${job.kind}"`;
    outcome = 'skipped';
  } else {
    try {
      await handler(job);
    } catch (e) {
      message = e instanceof Error ? e.message : String(e);
      if (e instanceof PermanentJobError) {
        console.warn(`[jobs] #${job.id} ${job.kind} descartado: ${message}`);
      } else {
        ok = false;
        outcome = 'retried';
        console.error(`[jobs] #${job.id} ${job.kind} intento ${job.attempts}: ${message}`);
      }
    }
  }

  const { error } = await supabase.rpc('worker_finish_job', { p_id: job.id, p_ok: ok, p_error: message ?? undefined });
  // Si no se pudo cerrar, el lock vence y otro worker lo retoma: los handlers son idempotentes.
  if (error) console.error(`[jobs] #${job.id} no se pudo cerrar: ${error.message}`);
  return outcome;
}

/** Salud de la cola para /api/v1/health: falla si el pendiente más antiguo pasa de 10 minutos. */
export async function queueHealth(supabase: ServiceClient) {
  const { data, error } = await supabase.rpc('worker_queue_health');
  if (error) throw new Error(`worker_queue_health: ${error.message}`);
  const h = data as { pending: number; oldest_pending_seconds: number; stale_running: number; dead: number };
  return { ...h, healthy: h.oldest_pending_seconds < 600 };
}
