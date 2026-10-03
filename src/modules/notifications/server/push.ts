import 'server-only';
import webpush, { WebPushError } from 'web-push';
import { publicEnv } from '@/config/env';
import { serverEnv } from '@/config/server-env';
import { notificationHref, type NotificationPayload } from '../href';

export interface PushTarget {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface PushMessage {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  payload: NotificationPayload;
}

export interface PushOutcome {
  ok: string[];
  /** El servicio de push dio la suscripción por muerta (404/410): se elimina. */
  gone: string[];
  /** Fallos que pueden arreglarse solos (429, 5xx, red): conviene reintentar. */
  transient: string[];
}

let configured: boolean | null = null;

/** Claves VAPID (ADR-013). Sin claves no hay push: las notificaciones siguen llegando in-app. */
export function pushConfigured() {
  if (configured === null) {
    const { VAPID_PRIVATE_KEY, VAPID_SUBJECT } = serverEnv();
    const publicKey = publicEnv.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    configured = !!(publicKey && VAPID_PRIVATE_KEY && VAPID_SUBJECT);
    if (configured) webpush.setVapidDetails(VAPID_SUBJECT!, publicKey!, VAPID_PRIVATE_KEY!);
  }
  return configured;
}

/** Lo que recibe el service worker (public/sw.js). Solo título, texto y enlace interno: nada privado más allá de eso. */
export function pushBody(m: PushMessage) {
  return JSON.stringify({
    title: m.title,
    body: m.body ?? '',
    url: notificationHref(m.kind, m.payload) ?? '/notificaciones',
    tag: m.id,
  });
}

/** Envía a todos los dispositivos del usuario y clasifica cada resultado. */
export async function sendPush(message: PushMessage, targets: PushTarget[]): Promise<PushOutcome> {
  const body = pushBody(message);
  const urgent = message.kind === 'traffic_nearby';
  const out: PushOutcome = { ok: [], gone: [], transient: [] };

  await Promise.all(
    targets.map(async (t) => {
      try {
        await webpush.sendNotification({ endpoint: t.endpoint, keys: { p256dh: t.p256dh, auth: t.auth } }, body, {
          TTL: urgent ? 60 * 60 : 24 * 60 * 60, // una alerta de tránsito vieja ya no sirve
          urgency: urgent ? 'high' : 'normal',
          timeout: 10_000,
        });
        out.ok.push(t.endpoint);
      } catch (e) {
        const status = e instanceof WebPushError ? e.statusCode : 0;
        if (status === 404 || status === 410) out.gone.push(t.endpoint);
        else if (status === 0 || status === 429 || status >= 500) out.transient.push(t.endpoint);
        // otros 4xx (clave inválida, mensaje grande): reintentar no sirve, se descarta ese dispositivo
        else console.warn(`[push] ${status} en ${new URL(t.endpoint).host}`);
      }
    }),
  );
  return out;
}
