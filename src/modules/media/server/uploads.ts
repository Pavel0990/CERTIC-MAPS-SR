import 'server-only';
import type { ServerSupabase } from '@/lib/supabase/server';
import type { RpcResult } from '@/lib/http';

export type AttachmentEntity = 'business' | 'tourism_place' | 'eco_route' | 'traffic_report' | 'citizen_request';
export const ATTACHMENT_ENTITIES: AttachmentEntity[] = ['business', 'tourism_place', 'eco_route', 'traffic_report', 'citizen_request'];
const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' } as const;
export type ImageMime = keyof typeof EXT;

/**
 * URL de subida firmada en la carpeta propia del usuario (§10.5, paso 1).
 * El nombre lo genera el servidor; el nombre del archivo del cliente nunca llega a la ruta.
 * La firma se hace con el JWT del usuario: la política de Storage exige incoming/{uid}/ y 20 subidas por hora.
 */
export async function signUpload(supabase: ServerSupabase, userId: string, mime: ImageMime) {
  const path = `incoming/${userId}/${crypto.randomUUID()}.${EXT[mime]}`;
  const { data, error } = await supabase.storage.from('report-evidence').createSignedUploadUrl(path);
  if (error || !data) return { status: 'rejected' as const, reason: 'rate_limited' };
  return { status: 'ok' as const, bucket: 'report-evidence', path: data.path, token: data.token };
}

/** Vincula el archivo subido a su entidad (§10.5, paso 3). La RPC valida ruta, MIME, tamaño, dueño y límite. */
export async function registerAttachment(supabase: ServerSupabase, entity: AttachmentEntity, entityId: string, path: string) {
  const { data, error } = await supabase.rpc('register_attachment', { p_entity: entity, p_entity_id: entityId, p_path: path });
  if (error) throw new Error(`register_attachment: ${error.message}`);
  return data as unknown as RpcResult;
}

export interface PhotoView { id: string; url: string; status: string }

/**
 * Fotos de una entidad. Las públicas (public-media) se sirven con URL pública;
 * la evidencia privada, con URL firmada de 5 minutos creada con el JWT del usuario (§10.5).
 */
export async function listPhotos(supabase: ServerSupabase, column: 'business_id' | 'tourism_place_id' | 'eco_route_id' | 'traffic_report_id' | 'citizen_request_id', id: string): Promise<PhotoView[]> {
  const { data } = await supabase.from('attachments').select('id, bucket, path, status').eq(column, id).neq('status', 'rejected').order('created_at');
  const rows = data ?? [];
  const out: PhotoView[] = [];
  for (const r of rows) {
    if (r.bucket === 'public-media') {
      out.push({ id: r.id, status: r.status, url: supabase.storage.from('public-media').getPublicUrl(r.path).data.publicUrl });
    } else {
      const { data: signed } = await supabase.storage.from('report-evidence').createSignedUrl(r.path, 300);
      if (signed?.signedUrl) out.push({ id: r.id, status: r.status, url: signed.signedUrl });
    }
  }
  return out;
}
