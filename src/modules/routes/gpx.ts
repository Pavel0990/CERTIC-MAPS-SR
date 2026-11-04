import { MAX_ROUTE_POINTS } from './schemas';

type Position = [number, number];

const POINT_TAG = /<(?:\w+:)?(trkpt|rtept)\b([^>]*)>/gi;
const attr = (attrs: string, name: string) => {
  const m = new RegExp(`\\b${name}\\s*=\\s*["']([^"']+)["']`, 'i').exec(attrs);
  return m ? Number(m[1]) : NaN;
};

/**
 * Lee los puntos de un archivo GPX (pistas `trkpt`, o puntos de ruta `rtept` si no hay pistas).
 * Devuelve [lng, lat] como GeoJSON. Se hace con expresiones regulares para funcionar igual en el
 * navegador y en las pruebas (sin DOMParser) y para no ejecutar nada del archivo.
 */
export function parseGpx(xml: string): Position[] {
  const track: Position[] = [];
  const route: Position[] = [];
  for (const m of xml.matchAll(POINT_TAG)) {
    const [, tag = '', attrs = ''] = m;
    const lat = attr(attrs, 'lat');
    const lng = attr(attrs, 'lon');
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) continue;
    (tag.toLowerCase() === 'trkpt' ? track : route).push([lng, lat]);
  }
  return dedupe(track.length ? track : route);
}

/** Quita puntos repetidos seguidos (los GPS los repiten cuando la persona se detiene). */
function dedupe(points: Position[]) {
  return points.filter((p, i) => {
    const prev = points[i - 1];
    return !prev || p[0] !== prev[0] || p[1] !== prev[1];
  });
}

/** Reduce el trazado a como mucho `max` puntos, conservando siempre el primero y el último. */
export function thinPoints(points: Position[], max = MAX_ROUTE_POINTS): Position[] {
  if (points.length <= max) return points;
  const step = (points.length - 1) / (max - 1);
  return Array.from({ length: max }, (_, i) => points[Math.round(i * step)] as Position);
}
