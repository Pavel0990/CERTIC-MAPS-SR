'use client';
import { getBrowserClient } from '@/lib/supabase/client';
import { AVATAR_BUCKET, AVATAR_SIZE, avatarPath } from '../avatar';

/** Tope del bucket (64 KB). A 256×256 en WebP una foto real pesa 10-20 KB; se baja la calidad si hiciera falta. */
const MAX_BYTES = 65_536;

/**
 * Recorta al centro en un cuadrado de 256×256 y codifica en WebP, en el teléfono.
 * Volver a dibujar con canvas descarta el EXIF (ubicación y datos del dispositivo).
 */
export async function cropAvatar(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/')) throw new Error('not_image');
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const side = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - side) / 2;
  const sy = (bitmap.height - side) / 2;
  const canvas = new OffscreenCanvas(AVATAR_SIZE, AVATAR_SIZE);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('no_canvas');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
  bitmap.close();
  // WebP donde se puede; en iPhone (Safari no codifica WebP desde el canvas) se usa JPEG. Mismo tope de 64 KB.
  for (const type of ['image/webp', 'image/jpeg'] as const) {
    for (const quality of [0.82, 0.7, 0.55]) {
      const blob = await canvas.convertToBlob({ type, quality });
      if (blob.type !== type) break; // este navegador no sabe codificarlo: probar el siguiente formato
      if (blob.size <= MAX_BYTES) return blob;
    }
  }
  throw new Error('too_large');
}

/** Sube la foto ya recortada a su ruta fija (reemplaza la anterior). La caché larga la sirve la CDN. */
export async function uploadAvatar(userId: string, blob: Blob) {
  const { error } = await getBrowserClient().storage.from(AVATAR_BUCKET).upload(avatarPath(userId), blob, {
    upsert: true,
    contentType: blob.type === 'image/jpeg' ? 'image/jpeg' : 'image/webp',
    cacheControl: '31536000',
  });
  if (error) throw new Error(/10 seconds|row-level|policy/i.test(error.message) ? 'rate_limited' : 'upload_failed');
}

/** Borra el archivo; la versión del perfil la limpia después la acción del servidor. */
export async function deleteAvatar(userId: string) {
  const { error } = await getBrowserClient().storage.from(AVATAR_BUCKET).remove([avatarPath(userId)]);
  if (error) throw new Error('delete_failed');
}
