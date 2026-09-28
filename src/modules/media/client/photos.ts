'use client';
import { getBrowserClient } from '@/lib/supabase/client';

const MAX_SIDE = 1600;

/**
 * Comprime la foto en el teléfono antes de subirla (§13.7: menos datos móviles y almacenamiento).
 * Volver a codificar con canvas descarta el EXIF (ubicación y datos del dispositivo) desde el origen;
 * el worker lo vuelve a limpiar en el servidor de todas formas (§10.5).
 */
export async function compressImage(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/')) throw new Error('not_image');
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('no_canvas');
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  return canvas.convertToBlob({ type: 'image/jpeg', quality: 0.82 });
}

export type PhotoEntity = 'business' | 'tourism_place' | 'eco_route' | 'traffic_report' | 'citizen_request';

/** Sube fotos ya comprimidas y las vincula a su entidad (§10.5). Devuelve cuántas se registraron. */
export async function uploadPhotos(entity: PhotoEntity, entityId: string, photos: Blob[]) {
  const supabase = getBrowserClient();
  let ok = 0;
  const errors: string[] = [];
  for (const photo of photos) {
    const sign = await fetch('/api/v1/uploads/sign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mime: 'image/jpeg' }),
    });
    const s = await sign.json();
    if (!sign.ok || s.status !== 'ok') {
      errors.push(s.reason ?? 'sign_failed');
      continue;
    }
    const up = await supabase.storage.from(s.bucket).uploadToSignedUrl(s.path, s.token, photo, { contentType: 'image/jpeg' });
    if (up.error) {
      errors.push('upload_failed');
      continue;
    }
    const reg = await fetch('/api/v1/attachments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entity, entityId, path: s.path }),
    });
    const r = await reg.json();
    if (reg.ok && r.status === 'ok') ok++;
    else errors.push(r.reason ?? 'register_failed');
  }
  return { ok, errors };
}
