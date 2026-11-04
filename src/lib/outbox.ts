'use client';
// Cola de envío offline (ARCHITECTURE.md §6.4). Guarda reportes con sus fotos en IndexedDB y los
// reintenta al volver la conexión. Cada item conserva su idempotency_key: un reintento nunca duplica.
// Si la sesión venció, el item queda "requiere iniciar sesión"; nunca se descarta en silencio.

export type OutboxKind = 'traffic' | 'request';
export interface OutboxItem {
  id: string; // = idempotency key
  kind: OutboxKind;
  payload: Record<string, unknown>;
  photos: Blob[];
  createdAt: number;
  attempts: number;
  state: 'pending' | 'needs_login' | 'rejected';
  reason?: string;
}

const DB = 'sr-conecta';
const STORE = 'outbox';
const ENDPOINT: Record<OutboxKind, string> = { traffic: '/api/v1/reports', request: '/api/v1/requests' };
const ENTITY: Record<OutboxKind, 'traffic_report' | 'citizen_request'> = { traffic: 'traffic_report', request: 'citizen_request' };

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise<T>((resolve, reject) => {
    const r = fn(db.transaction(STORE, mode).objectStore(STORE));
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

export const outbox = {
  add: (item: OutboxItem) => tx('readwrite', (s) => s.put(item)),
  all: () => tx<OutboxItem[]>('readonly', (s) => s.getAll() as IDBRequest<OutboxItem[]>),
  remove: (id: string) => tx('readwrite', (s) => s.delete(id)),
};

export type SendResult =
  | { outcome: 'sent'; entityId: string; response: Record<string, unknown>; photoErrors: string[] }
  | { outcome: 'queued' }
  | { outcome: 'needs_login' }
  | { outcome: 'rejected'; reason: string };

/**
 * Envía un reporte. Si no hay red o el servidor no responde, lo deja en la cola.
 * `uploadPhotos` se inyecta para no acoplar esta cola a un módulo de dominio.
 */
export async function sendOrQueue(
  item: Omit<OutboxItem, 'attempts' | 'state' | 'createdAt'>,
  uploadPhotos: (entity: 'traffic_report' | 'citizen_request', id: string, photos: Blob[]) => Promise<{ errors: string[] }>,
): Promise<SendResult> {
  const full: OutboxItem = { ...item, attempts: 0, state: 'pending', createdAt: Date.now() };
  if (!navigator.onLine) {
    await outbox.add(full);
    return { outcome: 'queued' };
  }
  return attempt(full, uploadPhotos);
}

async function attempt(
  item: OutboxItem,
  uploadPhotos: (entity: 'traffic_report' | 'citizen_request', id: string, photos: Blob[]) => Promise<{ errors: string[] }>,
): Promise<SendResult> {
  let res: Response;
  try {
    res = await fetch(ENDPOINT[item.kind], {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': item.id },
      body: JSON.stringify({ ...item.payload, idempotencyKey: item.id }),
      // Señal débil (hay "red" pero nada pasa): a los 20 s se guarda en la cola en vez de esperar sin fin
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    await outbox.add({ ...item, attempts: item.attempts + 1 });
    return { outcome: 'queued' };
  }
  if (res.status === 401) {
    await outbox.add({ ...item, state: 'needs_login' });
    return { outcome: 'needs_login' };
  }
  // Errores pasajeros (servidor, demasiadas solicitudes, tiempo agotado): se reintenta más tarde
  if (res.status >= 500 || res.status === 408 || res.status === 429) {
    await outbox.add({ ...item, attempts: item.attempts + 1 });
    return { outcome: 'queued' };
  }
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (body.status !== 'ok') {
    await outbox.remove(item.id);
    return { outcome: 'rejected', reason: String(body.reason ?? (body.error as { code?: string } | undefined)?.code ?? 'unknown') };
  }
  const entityId = String(body.id ?? body.request_id ?? '');
  // El reporte ya existe: sale de la cola ANTES de las fotos, así un corte durante la subida no las duplica
  await outbox.remove(item.id);
  const photos = item.photos.length && entityId
    ? await uploadPhotos(ENTITY[item.kind], entityId, item.photos).catch(() => ({ errors: ['upload_failed'] }))
    : { errors: [] };
  return { outcome: 'sent', entityId, response: body, photoErrors: photos.errors };
}

/** Reintenta todo lo pendiente (al volver la conexión o al abrir la app). */
export async function flushOutbox(uploadPhotos: Parameters<typeof sendOrQueue>[1]) {
  const items = (await outbox.all()).filter((i) => i.state !== 'rejected');
  let sent = 0;
  const rejected: string[] = []; // motivos, para avisar: un reporte guardado nunca desaparece en silencio
  for (const it of items) {
    const r = await attempt({ ...it, state: 'pending' }, uploadPhotos);
    if (r.outcome === 'sent') sent++;
    if (r.outcome === 'rejected') rejected.push(r.reason);
    if (r.outcome === 'queued') break; // sigue sin red: no insistir con el resto
  }
  return { sent, rejected, remaining: (await outbox.all()).length };
}
