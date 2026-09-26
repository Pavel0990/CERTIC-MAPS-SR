const TZ = 'America/Santo_Domingo';

const dateFmt = new Intl.DateTimeFormat('es-DO', { timeZone: TZ, day: 'numeric', month: 'short' });
const dateTimeFmt = new Intl.DateTimeFormat('es-DO', { timeZone: TZ, day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
const rel = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });

export const formatDate = (iso: string | Date) => dateFmt.format(new Date(iso));
export const formatDateTime = (iso: string | Date) => dateTimeFmt.format(new Date(iso));

/** "hace 5 min", "ayer", "hace 3 días" */
export function timeAgo(iso: string | Date, now: Date = new Date()) {
  const s = (new Date(iso).getTime() - now.getTime()) / 1000;
  const abs = Math.abs(s);
  if (abs < 60) return 'ahora';
  if (abs < 3600) return rel.format(Math.round(s / 60), 'minute');
  if (abs < 86400) return rel.format(Math.round(s / 3600), 'hour');
  if (abs < 86400 * 30) return rel.format(Math.round(s / 86400), 'day');
  return formatDate(iso);
}

/** Distancia legible: "350 m", "2,4 km" */
export function formatDistance(km: number) {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1).replace('.', ',')} km`;
}

/** Duración legible: "45 min", "2 h 10 min" */
export function formatMinutes(min: number) {
  if (min < 60) return `${Math.max(1, Math.round(min))} min`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m ? `${h} h ${m} min` : `${h} h`;
}

export const formatNumber = (n: number) => new Intl.NumberFormat('es-DO').format(n);

/** Distancia en km entre dos puntos (haversine). */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

/** Normaliza texto para búsqueda local (sin acentos, minúsculas). */
export const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Enlace de navegación de Google Maps (sin costo de API, §7.3). */
export const directionsUrl = (lat: number, lng: number) =>
  `https://www.google.com/maps/dir/?api=1&destination=${lat.toFixed(6)},${lng.toFixed(6)}`;
