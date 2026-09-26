import type { BBox, LayerId } from './types';

export interface LayerDef { id: LayerId; label: string; color: string; icon: string; href: (id: string) => string | null }

// Íconos en trazos de 24×24 (los mismos del prototipo de diseño). Se dibujan dentro de los marcadores.
export const ICON_PATHS: Record<LayerId, string> = {
  business: 'M3 9l1.5-5h15L21 9M4 9v11h16V9M3 9h18M9 20v-6h6v6',
  tourism: 'M2 20 9 8l4 6 3-4 6 10z',
  route: 'M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM18 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM6 15V9a4 4 0 0 1 4-4h2M18 9v6a4 4 0 0 1-4 4h-2',
  traffic: 'M12 3 2 21h20zM12 10v5M12 18h.01',
  request: 'M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1zM16 8a5 5 0 0 1 0 8M19 5a9 9 0 0 1 0 14',
};

export const LAYERS: LayerDef[] = [
  { id: 'tourism', label: 'Turismo', color: '#16a34a', icon: ICON_PATHS.tourism, href: (id) => `/turismo/${id}` },
  { id: 'business', label: 'Negocios', color: '#2f6feb', icon: ICON_PATHS.business, href: (id) => `/negocios/${id}` },
  { id: 'route', label: 'Rutas', color: '#0e9f9a', icon: ICON_PATHS.route, href: (id) => `/rutas/${id}` },
  { id: 'traffic', label: 'Tránsito', color: '#e5484d', icon: ICON_PATHS.traffic, href: () => null },
  { id: 'request', label: 'Reportes', color: '#7c3aed', icon: ICON_PATHS.request, href: (id) => `/consultas/${id}` },
];

export const LAYER_BY_ID = Object.fromEntries(LAYERS.map((l) => [l.id, l])) as Record<LayerId, LayerDef>;
export const ALL_LAYERS: LayerId[] = LAYERS.map((l) => l.id);

/** Redondea el bbox hacia afuera a una rejilla de 0,01° para que requests parecidos compartan caché (§7.2). */
export function snapBBox(b: BBox, step = 0.01): BBox {
  const down = (v: number) => Math.floor(v / step) * step;
  const up = (v: number) => Math.ceil(v / step) * step;
  const r = (v: number) => Math.round(v * 1e4) / 1e4;
  return { minLng: r(down(b.minLng)), minLat: r(down(b.minLat)), maxLng: r(up(b.maxLng)), maxLat: r(up(b.maxLat)) };
}

export const containsBBox = (outer: BBox, inner: BBox) =>
  outer.minLng <= inner.minLng && outer.minLat <= inner.minLat && outer.maxLng >= inner.maxLng && outer.maxLat >= inner.maxLat;

/** El SQL rechaza bbox de más de 2° por lado (§7.2): se recorta alrededor del centro. */
export function clampBBox(b: BBox, maxSpan = 1.9): BBox {
  const cx = (b.minLng + b.maxLng) / 2;
  const cy = (b.minLat + b.maxLat) / 2;
  const hw = Math.min((b.maxLng - b.minLng) / 2, maxSpan / 2);
  const hh = Math.min((b.maxLat - b.minLat) / 2, maxSpan / 2);
  return { minLng: cx - hw, minLat: cy - hh, maxLng: cx + hw, maxLat: cy + hh };
}
