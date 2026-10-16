// Texto de una notificación tal como lo lee un vecino (centro in-app y push, §9.5).
// La base guarda el código del estado ("Nuevo estado: active"); aquí se traduce con las mismas etiquetas
// que ve la persona en "Mi actividad". Sin dependencias de servidor: se prueba con vitest.
import { CONTENT_STATUS, REQUEST_STATUS, TRAFFIC_STATUS } from '@/lib/vocabulary';

const BY_KIND: Record<string, Record<string, { label: string; explain: string }>> = {
  traffic_status: TRAFFIC_STATUS,
  request_status: REQUEST_STATUS,
  content_status: CONTENT_STATUS,
};

/** Cuerpo legible: "Nuevo estado: active" → "Activo. Se ve en el mapa ahora mismo." Lo demás no cambia. */
export function notificationBody(kind: string, body: string | null, payload: { status?: unknown }): string | null {
  if (!body) return body;
  const m = /^Nuevo estado: ([a-z_]+)$/.exec(body.trim());
  if (!m) return body;
  const code = typeof payload.status === 'string' ? payload.status : m[1]!;
  const info = BY_KIND[kind]?.[code];
  if (!info) return 'Cambió de estado. Toca para ver cómo va.';
  return info.explain ? `${info.label}. ${info.explain}` : info.label;
}
