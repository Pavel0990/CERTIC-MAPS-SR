'use client';
import { useEffect, useRef, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { compressImage, uploadPhotos, type PhotoEntity } from '@/modules/media';
import { useToast } from '@/components/ui/toast';
import { reasonMessage } from '@/lib/vocabulary';

export interface PickedPhoto { blob: Blob; url: string }

/** Fotos elegidas en el teléfono, ya comprimidas y sin EXIF (§10.5). Libera las vistas previas al salir. */
export function usePhotos(max: number) {
  const toast = useToast();
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const ref = useRef(photos);
  useEffect(() => {
    ref.current = photos;
  }, [photos]);
  useEffect(() => () => ref.current.forEach((p) => URL.revokeObjectURL(p.url)), []);

  async function add(files: FileList | null) {
    if (!files) return;
    const next: PickedPhoto[] = [];
    for (const f of Array.from(files).slice(0, max - photos.length)) {
      try {
        const blob = await compressImage(f);
        next.push({ blob, url: URL.createObjectURL(blob) });
      } catch {
        toast.show('Esa imagen no se pudo usar. Prueba con otra foto.', 'error');
      }
    }
    setPhotos((p) => [...p, ...next]);
  }
  function remove(p: PickedPhoto) {
    URL.revokeObjectURL(p.url);
    setPhotos((ps) => ps.filter((x) => x !== p));
  }
  /** Sube las fotos a la entidad ya creada. Devuelve el primer error en lenguaje simple, o null. */
  async function upload(entity: PhotoEntity, id: string) {
    if (!photos.length) return null;
    const r = await uploadPhotos(entity, id, photos.map((p) => p.blob));
    return r.errors.length ? reasonMessage(r.errors[0]) : null;
  }
  return { photos, add, remove, upload, max };
}

export function PhotoPicker({ state, hint }: { state: ReturnType<typeof usePhotos>; hint: string }) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <div>
      <p className="text-[15px] font-semibold">Fotos <span className="font-normal text-subtle">(opcional, hasta {state.max})</span></p>
      <p className="text-sm text-muted">{hint} Quitamos la ubicación y los datos del teléfono de cada foto.</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {state.photos.map((p, i) => (
          <div key={p.url} className="relative size-24 overflow-hidden rounded-[14px] bg-canvas">
            {/* eslint-disable-next-line @next/next/no-img-element -- vista previa local (blob:) */}
            <img src={p.url} alt={`Foto ${i + 1}`} className="size-full object-cover" />
            <button type="button" onClick={() => state.remove(p)} aria-label={`Quitar foto ${i + 1}`} className="absolute right-1 top-1 flex size-8 items-center justify-center rounded-full bg-ink/70 text-white">
              <X className="size-4" />
            </button>
          </div>
        ))}
        {state.photos.length < state.max && (
          <label className="flex size-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-[14px] border-2 border-dashed border-line-strong bg-surface text-sm font-semibold text-muted hover:border-brand hover:text-brand">
            <ImagePlus className="size-6" aria-hidden />
            Agregar
            <input
              ref={input}
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={async (e) => {
                await state.add(e.target.files);
                if (input.current) input.current.value = '';
              }}
            />
          </label>
        )}
      </div>
    </div>
  );
}
