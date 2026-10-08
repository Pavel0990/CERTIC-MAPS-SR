import Link from 'next/link';
import { ArrowRight, Navigation, X } from 'lucide-react';
import { LAYER_BY_ID, type LatLng, type MapFeature } from '@/modules/map';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/primitives';
import { SEVERITY } from '@/lib/vocabulary';
import { directionsUrl, distanceKm, formatDistance } from '@/utils/format';
import { LayerDot, subtitle, type ExplorerCatalogs } from './shared';

/** Ficha breve del punto elegido en el mapa: detalles y "Cómo llegar". */
export function SelectedCard({ feature, catalogs, userLocation, onClose }: { feature: MapFeature; catalogs: ExplorerCatalogs; userLocation: LatLng | null; onClose: () => void }) {
  const p = feature.properties;
  const L = LAYER_BY_ID[p.layer];
  const [lng, lat] = feature.geometry.coordinates;
  const href = L.href(p.id);
  const dist = userLocation ? formatDistance(distanceKm(userLocation, { lat, lng })) : null;
  return (
    <article aria-label={p.title} className="m-3 animate-sheet-in rounded-[20px] bg-surface p-4 shadow-[var(--shadow-float)] md:m-0">
      <div className="flex items-start gap-3">
        <LayerDot color={L.color} path={L.icon} />
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold leading-tight">{p.title}</h2>
          <p className="mt-0.5 text-[15px] text-muted">
            {subtitle(feature, catalogs)}
            {dist ? ` · a ${dist}` : ''}
          </p>
        </div>
        <button type="button" onClick={onClose} aria-label="Cerrar ficha" className="-mr-1 -mt-1 flex size-10 items-center justify-center rounded-full hover:bg-canvas">
          <X className="size-5" />
        </button>
      </div>
      {p.layer === 'traffic' && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge tone={SEVERITY[p.severity ?? 2]?.tone ?? 'danger'}>Gravedad {SEVERITY[p.severity ?? 2]?.label.toLowerCase()}</Badge>
          <span className="text-sm text-muted">Alerta vial · sale sola del mapa cuando vence</span>
        </div>
      )}
      <div className="mt-4 flex gap-2">
        {href && (
          <Link href={href} className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-[14px] bg-ink px-4 font-semibold text-white hover:bg-black">
            Ver detalles <ArrowRight className="size-4" aria-hidden />
          </Link>
        )}
        <a
          href={directionsUrl(lat, lng)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-[14px] bg-brand-soft px-4 font-semibold text-brand-strong hover:bg-[#dce8ff]"
        >
          <Navigation className="size-4" aria-hidden /> Cómo llegar
        </a>
      </div>
      {p.layer === 'traffic' && (
        <Button variant="ghost" size="sm" className="mt-2 w-full text-muted" onClick={onClose}>
          Entendido
        </Button>
      )}
    </article>
  );
}
