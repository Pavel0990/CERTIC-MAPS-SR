'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { PhotoEntity } from '@/modules/media';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { PhotoPicker, usePhotos } from './photo-picker';

/**
 * Agregar fotos a una ficha que ya existe (negocio, lugar o ruta). Hasta 10 por ficha (lo controla la base,
 * register_attachment): se comprimen y pierden el EXIF en el teléfono, y salen al público cuando las aprueba
 * un moderador en Validaciones.
 */
export function AddPhotos({ entity, id, room, hint }: { entity: PhotoEntity; id: string; room: number; hint: string }) {
  const router = useRouter();
  const toast = useToast();
  const photos = usePhotos(Math.max(0, room));
  const [busy, setBusy] = useState(false);
  if (room <= 0) return <p className="text-[15px] text-muted">Ya tiene el máximo de 10 fotos.</p>;
  return (
    <div className="flex flex-col gap-3">
      <PhotoPicker state={photos} hint={hint} />
      {photos.photos.length > 0 && (
        <Button
          loading={busy}
          className="self-start"
          onClick={async () => {
            setBusy(true);
            const err = await photos.upload(entity, id);
            setBusy(false);
            if (err) toast.show(err, 'error');
            else {
              toast.show('Subimos las fotos. Saldrán cuando las revise un moderador.');
              photos.photos.forEach((p) => photos.remove(p));
            }
            router.refresh();
          }}
        >
          Subir {photos.photos.length === 1 ? 'la foto' : `${photos.photos.length} fotos`}
        </Button>
      )}
    </div>
  );
}
