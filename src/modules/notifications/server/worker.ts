import 'server-only';
import { PermanentJobError, type JobHandlers } from '@/modules/jobs';
import type { ServiceSupabase } from '@/lib/supabase/admin';
import { pushConfigured, sendPush, type PushMessage, type PushTarget } from './push';

const MAX_ATTEMPTS = 5; // igual que private.jobs.max_attempts por defecto

function uuidFrom(payload: Record<string, unknown>, key: string) {
  const v = payload[key];
  if (typeof v !== 'string' || !/^[0-9a-f-]{36}$/i.test(v)) throw new PermanentJobError(`payload sin ${key} válido`);
  return v;
}

/** Handlers de entrega de notificaciones (ARCHITECTURE.md §9.5, ADR-013). */
export function notificationJobHandlers(supabase: ServiceSupabase): JobHandlers {
  async function pushResult(id: string, sent: boolean, ok: string[] = [], gone: string[] = []) {
    const { error } = await supabase.rpc('worker_push_result', { p_notification_id: id, p_sent: sent, p_ok_endpoints: ok, p_gone_endpoints: gone });
    if (error) throw new Error(`worker_push_result: ${error.message}`);
  }

  return {
    // Aviso in-app (y push si lo activó) al personal que modera lo que acaba de llegar
    async notify_moderators(job) {
      const { entity } = job.payload as { entity?: unknown };
      if (typeof entity !== 'string') throw new PermanentJobError('payload sin entity');
      const { error } = await supabase.rpc('worker_notify_moderators', { p_entity: entity, p_id: uuidFrom(job.payload, 'id') });
      if (error) throw new Error(`worker_notify_moderators: ${error.message}`);
    },

    // Alerta de tránsito a los vecinos del municipio. La base inserta todo en una transacción
    // y encola un job 'push' por cada destinatario con push activo.
    async fanout_alert(job) {
      const { error } = await supabase.rpc('worker_run_fanout_alert', { p_traffic_report_id: uuidFrom(job.payload, 'traffic_report_id') });
      if (error) throw new Error(`worker_run_fanout_alert: ${error.message}`);
    },

    async push(job) {
      const id = uuidFrom(job.payload, 'notification_id');
      const { data, error } = await supabase.rpc('worker_push_payload', { p_notification_id: id });
      if (error) throw new Error(`worker_push_payload: ${error.message}`);
      const n = data as unknown as (PushMessage & { subscriptions: PushTarget[] }) | null;
      if (!n) return; // ya enviada, fallida o borrada

      // Sin claves VAPID o sin dispositivos: la notificación queda solo in-app
      if (!pushConfigured() || n.subscriptions.length === 0) return pushResult(id, false);

      const out = await sendPush(n, n.subscriptions);
      if (out.ok.length > 0) return pushResult(id, true, out.ok, out.gone);
      if (out.transient.length > 0 && job.attempts < MAX_ATTEMPTS) {
        throw new Error(`push sin entregar en ${out.transient.length} dispositivo(s); se reintenta`);
      }
      return pushResult(id, false, [], out.gone);
    },
  };
}
