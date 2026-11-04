import 'server-only';
import type { ServerSupabase } from '@/lib/supabase/server';
import { asRpcResult } from '@/lib/rpc';

export type AttachmentEntity = 'business' | 'tourism_place' | 'eco_route' | 'traffic_report' | 'citizen_request';
export const ATTACHMENT_ENTITIES: AttachmentEntity[] = ['business', 'tourism_place', 'eco_route', 'traffic_report', 'citizen_request'];
const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' } as const;
export type ImageMime = keyof typeof EXT;

/**
 * URL de subida firmada en la carpeta propia del usuario (§10.5, paso 1).
 * La ruta la genera la base (request_upload): es un permiso de un solo uso, con límite de 20 por hora, que la política
 * de Storage exige para aceptar el archivo. Así nadie junta cientos de URLs firmadas para llenar el almacenamiento.
 * El nombre del archivo del cliente nunca llega a la ruta. La firma se hace con el JWT del usuario.
 */
export async function signUpload(supabase: ServerSupabase, _userId: string, mime: ImageMime) {
  const grant = asRpcResult('request_upload', await supabase.rpc('request_upload', { p_ext: EXT[mime] }));
  if (grant.status !== 'ok') return { status: 'rejected' as const, reason: grant.status === 'rejected' ? grant.reason : 'rate_limited' };
  const path = String(grant.path);
  const { data, error } = await supabase.storage.from('report-evidence').createSignedUploadUrl(path);
  if (error || !data) return { status: 'rejected' as const, reason: 'rate_limited' };
  return { status: 'ok' as const, bucket: 'report-evidence', path: data.path, token: data.token };
}

/** Vincula el archivo subido a su entidad (§10.5, paso 3). La RPC valida ruta, MIME, tamaño, dueño y límite. */
export async function registerAttachment(supabase: ServerSupabase, entity: AttachmentEntity, entityId: string, path: string) {
  return asRpcResult('register_attachment', await supabase.rpc('register_attachment', { p_entity: entity, p_entity_id: entityId, p_path: path }));
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
