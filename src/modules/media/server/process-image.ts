import sharp from 'sharp';
import { PermanentJobError } from '@/modules/jobs';

/** Límites del procesamiento (ARCHITECTURE.md §10.5, paso 4). */
export const IMAGE_LIMITS = { maxSide: 4096, maxPixels: 40_000_000, quality: 80 } as const;

const ACCEPTED = new Set(['jpeg', 'png', 'webp']);

export interface ProcessedImage {
  data: Buffer;
  width: number;
  height: number;
}

/**
 * Re-codifica una foto subida por un usuario:
 *  · decide el formato por el contenido (magic bytes), nunca por la extensión o el MIME declarado;
 *  · rechaza imágenes de más de 40 MP antes de decodificarlas (bombas de descompresión);
 *  · aplica la orientación EXIF y descarta TODOS los metadatos (GPS, cámara, fecha);
 *  · limita a 4096 px por lado y guarda WebP.
 * Un archivo que no es una imagen válida lanza PermanentJobError: reintentar no lo arregla.
 */
export async function processImage(input: Buffer): Promise<ProcessedImage> {
  let format: string | undefined;
  try {
    ({ format } = await sharp(input, { limitInputPixels: IMAGE_LIMITS.maxPixels }).metadata());
  } catch (e) {
    throw new PermanentJobError(`imagen ilegible: ${e instanceof Error ? e.message : 'desconocido'}`);
  }
  if (!format || !ACCEPTED.has(format)) throw new PermanentJobError(`formato no permitido: ${format ?? 'desconocido'}`);

  try {
    const { data, info } = await sharp(input, { limitInputPixels: IMAGE_LIMITS.maxPixels, animated: false })
      .rotate() // orientación EXIF aplicada a los píxeles; sin withMetadata() no se copia ningún metadato
      .resize({ width: IMAGE_LIMITS.maxSide, height: IMAGE_LIMITS.maxSide, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: IMAGE_LIMITS.quality })
      .toBuffer({ resolveWithObject: true });
    return { data, width: info.width, height: info.height };
  } catch (e) {
    throw new PermanentJobError(`no se pudo procesar la imagen: ${e instanceof Error ? e.message : 'desconocido'}`);
  }
}
