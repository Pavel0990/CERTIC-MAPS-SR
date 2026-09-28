import { z } from 'zod';
import { signUpload } from '@/modules/media/server';
import { NO_STORE, errorResponse, rpcResponse } from '@/lib/http';
import { readJson, requireApiUser } from '@/lib/api-auth';

const body = z.object({ mime: z.enum(['image/jpeg', 'image/png', 'image/webp']) });

// POST /api/v1/uploads/sign — URL de subida firmada en incoming/{uid}/ (§10.5).
export async function POST(request: Request) {
  const auth = await requireApiUser();
  if ('error' in auth) return auth.error;
  const parsed = body.safeParse(await readJson(request));
  if (!parsed.success) return errorResponse(400, 'invalid_body', 'Tipo de imagen no permitido.');
  return rpcResponse(await signUpload(auth.supabase, auth.userId, parsed.data.mime), 200, NO_STORE);
}
