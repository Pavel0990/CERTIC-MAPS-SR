import { citizenRequestInput } from '@/modules/citizen-reports';
import { createCitizenRequest } from '@/modules/citizen-reports/server';
import { NO_STORE, errorResponse, rpcResponse } from '@/lib/http';
import { readJson, requireApiUser } from '@/lib/api-auth';

// POST /api/v1/requests — incidencia o consulta municipal (F5). Idempotente (§12.2).
export async function POST(request: Request) {
  const auth = await requireApiUser();
  if ('error' in auth) return auth.error;
  const body = (await readJson(request)) as Record<string, unknown> | null;
  const parsed = citizenRequestInput.safeParse({ ...body, idempotencyKey: request.headers.get('Idempotency-Key') ?? body?.idempotencyKey });
  if (!parsed.success) return errorResponse(400, 'invalid_body', parsed.error.issues[0]?.message ?? 'Datos inválidos.');
  try {
    return rpcResponse(await createCitizenRequest(auth.supabase, parsed.data), 201, NO_STORE);
  } catch {
    return errorResponse(503, 'unavailable', 'No pudimos guardar el reporte. Inténtalo otra vez.');
  }
}
