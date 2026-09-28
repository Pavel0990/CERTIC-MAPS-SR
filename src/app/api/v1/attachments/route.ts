import { z } from 'zod';
import { ATTACHMENT_ENTITIES, registerAttachment, type AttachmentEntity } from '@/modules/media/server';
import { NO_STORE, errorResponse, rpcResponse } from '@/lib/http';
import { readJson, requireApiUser } from '@/lib/api-auth';

const body = z.object({
  entity: z.enum(ATTACHMENT_ENTITIES as [AttachmentEntity, ...AttachmentEntity[]]),
  entityId: z.uuid(),
  path: z.string().min(10).max(200),
});

// POST /api/v1/attachments — vincula una foto subida a su entidad (register_attachment, §10.5).
export async function POST(request: Request) {
  const auth = await requireApiUser();
  if ('error' in auth) return auth.error;
  const parsed = body.safeParse(await readJson(request));
  if (!parsed.success) return errorResponse(400, 'invalid_body', 'Datos de la foto inválidos.');
  try {
    return rpcResponse(await registerAttachment(auth.supabase, parsed.data.entity, parsed.data.entityId, parsed.data.path), 201, NO_STORE);
  } catch {
    return errorResponse(503, 'unavailable', 'No pudimos guardar la foto.');
  }
}
