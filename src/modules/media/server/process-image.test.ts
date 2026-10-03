import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { PermanentJobError } from '@/modules/jobs';
import { IMAGE_LIMITS, processImage } from './process-image';

const photo = (width: number, height: number, orientation?: number) =>
  sharp({ create: { width, height, channels: 3, background: '#2a7' } })
    .jpeg()
    .withMetadata({ exif: { IFD0: { Make: 'CamaraDePrueba', Model: 'X1' } }, ...(orientation ? { orientation } : {}) })
    .toBuffer();

describe('processImage', () => {
  it('re-codifica a WebP, aplica la orientación y quita todos los metadatos', async () => {
    const out = await processImage(await photo(300, 200, 6));
    const meta = await sharp(out.data).metadata();
    expect(meta.format).toBe('webp');
    // orientación 6 = girada 90°: los píxeles quedan rotados y ya no hace falta la etiqueta
    expect([out.width, out.height]).toEqual([200, 300]);
    expect(meta.exif).toBeUndefined();
    expect(meta.orientation).toBeUndefined();
  });

  it('limita el lado mayor sin agrandar fotos pequeñas', async () => {
    const big = await processImage(await photo(5000, 1000));
    expect(big.width).toBe(IMAGE_LIMITS.maxSide);
    const small = await processImage(await photo(120, 80));
    expect([small.width, small.height]).toEqual([120, 80]);
  });

  it('rechaza de forma permanente lo que no es una imagen permitida', async () => {
    await expect(processImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'))).rejects.toBeInstanceOf(PermanentJobError);
    await expect(processImage(Buffer.from('no soy una foto'))).rejects.toBeInstanceOf(PermanentJobError);
    const gif = await sharp({ create: { width: 4, height: 4, channels: 3, background: '#000' } }).gif().toBuffer();
    await expect(processImage(gif)).rejects.toThrow(/formato no permitido/);
  });
});
