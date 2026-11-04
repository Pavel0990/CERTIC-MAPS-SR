import { LAYER_BY_ID, type MapFeature } from '@/modules/map';
import { SEVERITY } from '@/lib/vocabulary';

export interface ExplorerCatalogs {
  trafficTypes: Record<string, string>;
  categories: Record<string, string>;
}

/** Segunda línea de un punto del mapa: capa y categoría, o gravedad si es una alerta vial. */
export function subtitle(f: MapFeature, catalogs: ExplorerCatalogs) {
  const L = LAYER_BY_ID[f.properties.layer];
  if (f.properties.layer === 'traffic') return `${SEVERITY[f.properties.severity ?? 2]?.label ?? ''} · alerta vial`;
  const cat = f.properties.category ? catalogs.categories[f.properties.category] ?? '' : '';
  return [L.label, cat].filter(Boolean).join(' · ');
}

export function LayerDot({ color, path }: { color: string; path: string }) {
  return (
    <span className="flex size-10 shrink-0 items-center justify-center rounded-full text-white" style={{ background: color }} aria-hidden>
      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
        <path d={path} />
      </svg>
    </span>
  );
}
