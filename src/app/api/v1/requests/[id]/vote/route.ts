import { z } from 'zod';
import { toggleVote } from '@/modules/citizen-reports/server';
import { NO_STORE, errorResponse, rpcResponse } from '@/lib/http';
import { requireApiUser } from '@/lib/api-auth';

// POST /api/v1/requests/:id/vote — apoya o quita el apoyo a una consulta pública (F5 "voten prioridades").
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return errorResponse(400, 'invalid_id', 'Identificador inválido.');
  const auth = await requireApiUser();
  if ('error' in auth) return auth.error;
  try {
    return rpcResponse(await toggleVote(auth.supabase, id), 200, NO_STORE);
  } catch {
    return errorResponse(503, 'unavailable', 'No pudimos registrar tu apoyo.');
  }
}
