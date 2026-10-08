import 'server-only';
import type { ServerSupabase } from '@/lib/supabase/server';
import { notificationHref, type NotificationPayload } from '../href';


export interface NotificationView {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  href: string | null;
  read: boolean;
  created_at: string;
}

export async function listNotifications(supabase: ServerSupabase, limit = 50): Promise<NotificationView[]> {
  const { data } = await supabase.from('notifications').select('id, kind, title, body, payload, read_at, created_at').order('created_at', { ascending: false }).limit(limit);
  return (data ?? []).map((n) => ({
    id: n.id,
    kind: n.kind,
    title: n.title,
    body: n.body,
    href: notificationHref(n.kind, (n.payload ?? {}) as NotificationPayload),
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

/** Cuántas notificaciones sin leer tiene quien llama (RLS: solo las propias). */
export async function countUnread(supabase: ServerSupabase) {
  const { count } = await supabase.from('notifications').select('id', { count: 'exact', head: true }).is('read_at', null);
  return count ?? 0;
}

/** Temas y municipios de interés (§9.5). El canal email llega en Fase 2 (ADR-013). */
export async function savePreferences(supabase: ServerSupabase, userId: string, topics: string[], municipalities: string[]) {
  const { error } = await supabase.from('notification_preferences').upsert({ user_id: userId, topics, municipalities }, { onConflict: 'user_id' });
  return !error;
}
