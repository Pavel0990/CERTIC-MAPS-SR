// Destino de cada notificación (centro in-app y push, §9.5). Sin dependencias de servidor: se prueba con vitest.

export type NotificationPayload = {
  request_id?: string;
  traffic_report_id?: string;
  entity?: string;
  id?: string;
  report_run_id?: string;
  /** Avisos al personal: enlace directo a su bandeja del panel. */
  href?: string;
};

/** Solo rutas internas del panel: el payload nunca puede llevar a otro sitio. */
const STAFF_HREF = /^\/admin(\/[a-z-]+)*$/;

export function notificationHref(kind: string, payload: NotificationPayload): string | null {
  if (typeof payload.href === 'string' && STAFF_HREF.test(payload.href)) return payload.href;
  if (payload.request_id) return `/consultas/${payload.request_id}`;
  if (payload.traffic_report_id) return kind === 'traffic_nearby' ? '/mapa?capas=traffic' : '/actividad';
  if (payload.report_run_id) return '/admin/informes';
  if (payload.entity && payload.id) {
    if (payload.entity === 'business' || payload.entity === 'promotion') return '/negocio';
    if (payload.entity === 'place') return `/turismo/${payload.id}`;
    if (payload.entity === 'route') return `/rutas/${payload.id}`;
  }
  return null;
}
