import { ImageOff } from 'lucide-react';

/**
 * Fotos de una ficha. La primera va grande. Las fotos que el worker aún no procesó
 * se muestran con un aviso: aparecen solas cuando quedan listas (REPARTO-DE-TRABAJO, B1).
 */
export function PhotoGallery({ photos, name }: { photos: { id: string; url: string; status: string }[]; name: string }) {
  if (!photos.length) return null;
  const pending = photos.filter((p) => p.status !== 'approved').length;
  return (
    <div className="flex flex-col gap-2">
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3" aria-label="Fotos">
        {photos.map((ph, i) => (
          <li key={ph.id} className={i === 0 ? 'col-span-2 aspect-[16/9] overflow-hidden rounded-[18px] bg-canvas sm:col-span-3' : 'aspect-square overflow-hidden rounded-[12px] bg-canvas'}>
            {/* eslint-disable-next-line @next/next/no-img-element -- URL pública o firmada de Storage (§10.5) */}
            <img src={ph.url} alt={`Foto ${i + 1} de ${name}`} className="size-full object-cover" loading={i === 0 ? 'eager' : 'lazy'} />
          </li>
        ))}
      </ul>
      {pending > 0 && (
        <p className="flex items-center gap-2 text-sm text-muted">
          <ImageOff className="size-4" aria-hidden />
          {pending === 1 ? '1 foto está en revisión' : `${pending} fotos están en revisión`}: por ahora solo las ven tú y el municipio.
        </p>
      )}
    </div>
  );
}
