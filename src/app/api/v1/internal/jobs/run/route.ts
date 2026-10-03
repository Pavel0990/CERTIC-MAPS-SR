import { runJobs } from '@/modules/jobs/server';
import { mediaJobHandlers } from '@/modules/media/server';
import { notificationJobHandlers } from '@/modules/notifications/server';
import { serverEnv } from '@/config/server-env';
import { errorResponse, NO_STORE } from '@/lib/http';
import { hasBearer } from '@/lib/internal-auth';
import { createServiceClient } from '@/lib/supabase/admin';

// POST /api/v1/internal/jobs/run: consumidor de la cola (ADR-016, ARCHITECTURE.md §11.3).
// Lo despierta pg_cron cada minuto vía pg_net (private.wake_worker) con `Authorization: Bearer JOBS_SECRET`.
// Es el ÚNICO lugar con service_role junto al cron: nunca lo llama un usuario.
export const maxDuration = 60;

export async function POST(request: Request) {
  if (!hasBearer(request, serverEnv().JOBS_SECRET)) return errorResponse(401, 'unauthorized', 'No autorizado.');
  const supabase = createServiceClient();
  try {
    const summary = await runJobs(supabase, {
      handlers: { ...mediaJobHandlers(supabase), ...notificationJobHandlers(supabase) },
      budgetMs: 45_000,
    });
    return Response.json(summary, { headers: NO_STORE });
  } catch (e) {
    console.error('[jobs] ejecución abortada:', e instanceof Error ? e.message : e);
    return errorResponse(503, 'unavailable', 'La cola no está disponible.');
  }
}
