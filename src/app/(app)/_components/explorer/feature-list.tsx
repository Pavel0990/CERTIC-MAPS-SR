import { LAYER_BY_ID, type LatLng, type MapFeature } from '@/modules/map';
import { distanceKm, formatDistance } from '@/utils/format';
import { LayerDot, subtitle, type ExplorerCatalogs } from './shared';

const pointOf = (f: MapFeature) => ({ lng: f.geometry.coordinates[0], lat: f.geometry.coordinates[1] });

/** Ordena por distancia al usuario, si se conoce su ubicación. */
export function byDistance(features: MapFeature[], userLocation: LatLng | null) {
  if (!userLocation) return features;
  return [...features].sort((a, b) => distanceKm(userLocation, pointOf(a)) - distanceKm(userLocation, pointOf(b)));
}

/** Lista accesible: todo lo del mapa tiene su equivalente en lista (§6.1). */
export function FeatureList({ items, catalogs, userLocation, onSelect }: {
  items: MapFeature[];
  catalogs: ExplorerCatalogs;
  userLocation: LatLng | null;
  onSelect: (f: MapFeature) => void;
}) {
  return (
    <section aria-label="Lugares en esta zona" className="absolute inset-x-0 bottom-0 top-[124px] z-10 overflow-y-auto bg-canvas p-3 md:left-3 md:right-auto md:top-[132px] md:w-[400px] md:rounded-t-[18px] md:p-0">
      <p className="mb-2 px-1 text-sm font-semibold text-muted">{items.length} en esta zona{userLocation ? ', los más cercanos primero' : ''}</p>
      <ul className="flex flex-col gap-2">
        {items.map((f) => {
          const L = LAYER_BY_ID[f.properties.layer];
          return (
            <li key={f.properties.id}>
              <button type="button" onClick={() => onSelect(f)} className="flex w-full items-center gap-3 rounded-[16px] bg-surface p-3 text-left shadow-[var(--shadow-card)] hover:bg-[#fafbfc]">
                <LayerDot color={L.color} path={L.icon} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{f.properties.title}</span>
                  <span className="block text-sm text-muted">{subtitle(f, catalogs)}</span>
                </span>
                {userLocation && <span className="text-sm font-semibold text-muted">{formatDistance(distanceKm(userLocation, pointOf(f)))}</span>}
              </button>
            </li>
          );
        })}
      </ul>
      {items.length === 0 && <p className="px-1 py-6 text-center text-muted">No hay nada en esta zona con las capas elegidas. Aleja el mapa o activa más capas.</p>}
    </section>
  );
}
