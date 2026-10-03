// API pública del módulo "jobs". Otros módulos y las páginas solo importan desde aquí (ADR-008).
// Worker de private.jobs: toma de lotes, reintentos y registro de handlers por kind. No conoce reglas de negocio.
// Los handlers los aporta cada módulo de dominio; la ruta /api/v1/internal/jobs/run los junta.

/** Tipos de trabajo del contrato de la cola (CHECK de private.jobs.kind, ARCHITECTURE.md §11.3). */
export type JobKind =
  | 'push'
  | 'email'
  | 'image_process'
  | 'publish_media'
  | 'pdf_weekly'
  | 'fanout_alert'
  | 'notify_moderators'
  | 'delete_storage_object';

export interface Job {
  id: number;
  kind: JobKind;
  payload: Record<string, unknown>;
  attempts: number;
}

/**
 * Procesa un trabajo. Si termina sin lanzar, el trabajo queda `done`.
 * Si lanza, se reintenta con espera exponencial hasta agotar los intentos (luego `dead`).
 * Un error permanente (dato inválido) no debe lanzar: se registra en la base y se termina bien.
 */
export type JobHandler = (job: Job) => Promise<void>;
export type JobHandlers = Partial<Record<JobKind, JobHandler>>;

/** Error permanente: reintentar no lo arregla. El worker lo registra y marca el trabajo como terminado. */
export class PermanentJobError extends Error {
  readonly permanent = true;
}

export interface RunSummary {
  claimed: number;
  done: number;
  retried: number;
  skipped: number;
  ms: number;
}
