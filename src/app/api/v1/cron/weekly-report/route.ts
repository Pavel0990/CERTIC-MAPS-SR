import { runWeeklyReport } from '@/modules/reports/server';
import { serverEnv } from '@/config/server-env';
import { errorResponse, NO_STORE } from '@/lib/http';
import { hasBearer } from '@/lib/internal-auth';
import { createServiceClient } from '@/lib/supabase/admin';

// GET /api/v1/cron/weekly-report: Vercel Cron diario a las 10:00 UTC (vercel.json), con
// `Authorization: Bearer CRON_SECRET`. Genera el informe de la semana anterior solo si falta (§9.6).
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!hasBearer(request, serverEnv().CRON_SECRET)) return errorResponse(401, 'unauthorized', 'No autorizado.');
  try {
    const result = await runWeeklyReport(createServiceClient());
    if (result.status === 'failed') console.error(`[informe] ${result.run_id}: ${result.error}`);
    return Response.json(result, { status: result.status === 'failed' ? 500 : 200, headers: NO_STORE });
  } catch (e) {
    console.error('[informe] abortado:', e instanceof Error ? e.message : e);
    return errorResponse(503, 'unavailable', 'No se pudo generar el informe.');
  }
}
