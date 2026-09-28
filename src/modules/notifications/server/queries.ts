import 'server-only';
import type { ServerSupabase } from '@/lib/supabase/server';

export interface NotificationView {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  href: string | null;
  read: boolean;
  created_at: string;
}

type Payload = { request_id?: string; traffic_report_id?: string; entity?: string; id?: string; report_run_id?: string };

/** Destino de cada notificación según su contenido (centro in-app, §9.5). */
export function notificationHref(kind: string, payload: Payload): string | null {
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

export async function listNotifications(supabase: ServerSupabase, limit = 50): Promise<NotificationView[]> {
  const { data } = await supabase.from('notifications').select('id, kind, title, body, payload, read_at, created_at').order('created_at', { ascending: false }).limit(limit);
  return (data ?? []).map((n) => ({
    id: n.id,
    kind: n.kind,
    title: n.title,
    body: n.body,
    href: notificationHref(n.kind, (n.payload ?? {}) as Payload),
    read: !!n.read_at,
    created_at: n.created_at,
  }));
}

export async function markAllRead(supabase: ServerSupabase) {
  await supabase.from('notifications').update({ read_at: new Date().toISOString() }).is('read_at', null);
}

export const TOPICS = [
  { id: 'traffic_nearby', label: 'Alertas de tránsito en mi municipio', hint: 'Accidentes, derrumbes y calles cerradas cerca de ti.' },
  { id: 'request_status', label: 'Cambios en mis reportes', hint: 'Cuando el municipio revisa, aprueba o resuelve lo que reportaste.' },
  { id: 'traffic_status', label: 'Mis alertas de tránsito', hint: 'Cuando se confirma o se descarta una alerta que enviaste.' },
  { id: 'content_status', label: 'Mis negocios y propuestas', hint: 'Cuando se aprueba un negocio, lugar, ruta o promoción.' },
  { id: 'system', label: 'Avisos del sistema', hint: 'Informes y avisos importantes.' },
] as const;

export async function getPreferences(supabase: ServerSupabase, userId: string) {
  const { data } = await supabase.from('notification_preferences').select('push_enabled, email_enabled, topics, municipalities').eq('user_id', userId).maybeSingle();
  // Mismos valores por defecto que la tabla (supabase/migrations/…070_notifications_system.sql)
  return data ?? { push_enabled: false, email_enabled: true, topics: ['request_status', 'traffic_status', 'content_status', 'traffic_nearby'], municipalities: [] as string[] };
}
