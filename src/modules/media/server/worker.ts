import 'server-only';
import { PermanentJobError, type JobHandlers } from '@/modules/jobs';
import type { ServiceSupabase } from '@/lib/supabase/admin';
import type { RpcResult } from '@/lib/http';
import { processImage } from './process-image';

type AttachmentInfo = { id: string; bucket: string; path: string; status: string; public: boolean };

const PRIVATE_BUCKET = 'report-evidence';
const PUBLIC_BUCKET = 'public-media';

async function attachmentInfo(supabase: ServiceSupabase, id: string) {
  const { data, error } = await supabase.rpc('worker_attachment_info', { p_id: id });
  if (error) throw new Error(`worker_attachment_info: ${error.message}`);
  return data as unknown as AttachmentInfo | null;
}

async function download(supabase: ServiceSupabase, bucket: string, path: string) {
  const { data, error } = await supabase.storage.from(bucket).download(path);
  if (error || !data) throw new Error(`descarga ${bucket}/${path}: ${error?.message ?? 'vacía'}`);
  return Buffer.from(await data.arrayBuffer());
}

function idFrom(payload: Record<string, unknown>, key: string) {
  const v = payload[key];
  if (typeof v !== 'string' || !/^[0-9a-f-]{36}$/i.test(v)) throw new PermanentJobError(`payload sin ${key} válido`);
  return v;
}

/**
 * Handlers de fotos (ARCHITECTURE.md §10.5). Todos son idempotentes: si el worker cae a mitad,
 * el reintento sobrescribe el mismo archivo destino y las RPC ignoran estados ya avanzados.
 */
export function mediaJobHandlers(supabase: ServiceSupabase): JobHandlers {
  return {
    // Paso 4: original con EXIF → WebP limpio en processed/{id}.webp. El original lo borra otro job.
    async image_process(job) {
      const id = idFrom(job.payload, 'attachment_id');
      const info = await attachmentInfo(supabase, id);
      if (!info || info.status !== 'pending') return; // ya procesada, rechazada o borrada

      const original = await download(supabase, info.bucket, info.path);
      let result: RpcResult;
      try {
        const img = await processImage(original);
        const finalPath = `processed/${id}.webp`;
        const up = await supabase.storage.from(PRIVATE_BUCKET).upload(finalPath, img.data, { contentType: 'image/webp', upsert: true });
        if (up.error) throw new Error(`subida ${finalPath}: ${up.error.message}`);
        const { data, error } = await supabase.rpc('worker_attachment_processed', {
          p_id: id, p_ok: true, p_final_path: finalPath, p_bytes: img.data.length, p_width: img.width, p_height: img.height,
        });
        if (error) throw new Error(`worker_attachment_processed: ${error.message}`);
        result = data as unknown as RpcResult;
      } catch (e) {
        if (!(e instanceof PermanentJobError)) throw e;
        // Archivo inválido: la foto queda rechazada y su original se borra igual
        const { data, error } = await supabase.rpc('worker_attachment_processed', { p_id: id, p_ok: false, p_error: e.message });
        if (error) throw new Error(`worker_attachment_processed: ${error.message}`);
        result = data as unknown as RpcResult;
      }
      if (result.status === 'rejected' && result.reason !== 'not_pending') throw new Error(`worker_attachment_processed: ${result.reason}`);
    },

    // Paso 5: foto aprobada de negocio, lugar o ruta → copia en el bucket público.
    async publish_media(job) {
      const id = idFrom(job.payload, 'attachment_id');
      const info = await attachmentInfo(supabase, id);
      if (!info || info.bucket === PUBLIC_BUCKET) return; // borrada o ya publicada
      if (!info.public) throw new PermanentJobError('la evidencia de reportes y consultas nunca se publica');
      if (info.status !== 'approved') return; // la aprobación se revirtió antes de publicar

      const file = await download(supabase, info.bucket, info.path);
      const up = await supabase.storage.from(PUBLIC_BUCKET).upload(info.path, file, { contentType: 'image/webp', upsert: true });
      if (up.error) throw new Error(`subida pública ${info.path}: ${up.error.message}`);
      const { data, error } = await supabase.rpc('worker_attachment_published', { p_id: id });
      if (error) throw new Error(`worker_attachment_published: ${error.message}`);
      const r = data as unknown as RpcResult;
      if (r.status === 'rejected') {
        // Se des-aprobó mientras copiábamos: la copia pública no debe quedar visible
        await supabase.storage.from(PUBLIC_BUCKET).remove([info.path]);
        return;
      }
      // La copia privada ya no hace falta; si falla, la retención no la toca y solo ocupa espacio
      await supabase.storage.from(PRIVATE_BUCKET).remove([info.path]);
    },

    // Originales con EXIF, subidas abandonadas, retención y bajas de cuenta.
    async delete_storage_object(job) {
      const { bucket, path } = job.payload as { bucket?: unknown; path?: unknown };
      if (typeof bucket !== 'string' || typeof path !== 'string' || !path) throw new PermanentJobError('payload sin bucket/path');
      if (![PRIVATE_BUCKET, PUBLIC_BUCKET].includes(bucket)) throw new PermanentJobError(`bucket no permitido: ${bucket}`);
      const { error } = await supabase.storage.from(bucket).remove([path]); // borrar algo que ya no existe no es error
      if (error) throw new Error(`borrado ${bucket}/${path}: ${error.message}`);
    },
  };
}
