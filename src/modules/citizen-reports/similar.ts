import { z } from 'zod';

// Aviso de reporte parecido cercano (DATABASE.md §5.23): antes de enviar una alerta de tránsito o un reporte
// al municipio, se pregunta si ya hay uno abierto del mismo tipo a menos de 150 m. Nunca bloquea el envío:
// ante cualquier fallo (la RPC todavía no existe en la base, sin señal, lentitud, límite de uso) no hay aviso.

/** Lo que el asistente pregunta: tipo de alerta (tránsito) o categoría de incidencia, y el punto elegido. */
export const similarReportsInput = z.object({
  kind: z.enum(['traffic', 'incident']),
  type: z.string().min(2).max(40),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});
export type SimilarReportsInput = z.infer<typeof similarReportsInput>;

const item = z.object({
  id: z.uuid(),
  kind: z.enum(['traffic', 'request']),
  type: z.string(),
  distance_m: z.number().int().nonnegative(),
  mine: z.boolean(),
  support_count: z.number().int().nonnegative().optional(),
  can_support: z.boolean().optional(),
  supported: z.boolean().optional(),
});
export type SimilarReport = z.infer<typeof item>;

const MAX_ITEMS = 3;
/** Lo más que esperamos la respuesta: si tarda más, el asistente sigue sin aviso. */
export const SIMILAR_TIMEOUT_MS = 1500;

/** Lee la respuesta de la RPC (o de la ruta); cualquier forma inesperada se trata como "sin resultados". */
export function parseSimilarItems(body: unknown): SimilarReport[] {
  if (!body || typeof body !== 'object' || (body as { status?: unknown }).status !== 'ok') return [];
  const parsed = z.array(item).safeParse((body as { items?: unknown }).items);
  return parsed.success ? parsed.data.slice(0, MAX_ITEMS) : [];
}

/**
 * Pregunta (desde el navegador) si hay reportes parecidos cerca. Nunca lanza ni espera más de `timeoutMs`:
 * sin señal, con error o si tarda, devuelve una lista vacía y el asistente sigue como siempre.
 */
export async function checkSimilarReports(
  input: SimilarReportsInput,
  { timeoutMs = SIMILAR_TIMEOUT_MS, fetchImpl = globalThis.fetch }: { timeoutMs?: number; fetchImpl?: typeof fetch } = {},
): Promise<SimilarReport[]> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return [];
  const ctrl = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<SimilarReport[]>((resolve) => {
    timer = setTimeout(() => {
      ctrl.abort();
      resolve([]);
    }, timeoutMs);
  });
  const request = (async () => {
    try {
      const r = await fetchImpl('/api/v1/reports/similar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
        signal: ctrl.signal,
      });
      if (!r.ok) return [];
      return parseSimilarItems(await r.json());
    } catch {
      return [];
    }
  })();
  try {
    return await Promise.race([request, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

/** Suma el apoyo de la persona a un reporte al municipio (la misma acción de voto de /consultas/:id). */
export async function supportSimilarReport(
  requestId: string,
  fetchImpl: typeof fetch = globalThis.fetch,
): Promise<{ ok: true; supportCount?: number } | { ok: false; reason?: string }> {
  const vote = async () => {
    const r = await fetchImpl(`/api/v1/requests/${requestId}/vote`, { method: 'POST' });
    const body = (await r.json().catch(() => ({}))) as { status?: string; voted?: boolean; support_count?: number; reason?: string };
    return { ok: r.ok && body.status === 'ok', body };
  };
  try {
    let res = await vote();
    // El voto es un interruptor: si ya lo había apoyado desde otra pantalla, este toque lo quitó; se vuelve a poner.
    if (res.ok && res.body.voted === false) res = await vote();
    if (!res.ok || res.body.voted === false) return { ok: false, reason: res.body.reason };
    return { ok: true, supportCount: res.body.support_count };
  } catch {
    return { ok: false, reason: 'unavailable' };
  }
}

export type SimilarAction =
  | { kind: 'view'; href: string; label: string }
  | { kind: 'support'; requestId: string; label: string }
  | { kind: 'continue'; label: string };

export interface SimilarNoticeModel {
  title: string;
  question: string;
  /** "Bache · a unos 40 m · 3 personas lo apoyan" */
  details: string[];
  /** Cuántos más hay cerca, además del primero (el más cercano). */
  more: number;
  actions: SimilarAction[];
}

/** Qué dice el aviso y qué botones lleva, a partir del reporte parecido más cercano. */
export function similarNotice(items: SimilarReport[], typeName: string, point: { lat: number; lng: number }): SimilarNoticeModel | null {
  const first = items[0];
  if (!first) return null;
  const canSupport = first.kind === 'request' && first.can_support === true && first.supported !== true;
  const details = [typeName, `a unos ${first.distance_m} m de aquí`];
  if (first.kind === 'request' && typeof first.support_count === 'number' && first.support_count > 0) {
    details.push(first.support_count === 1 ? '1 persona lo apoya' : `${first.support_count} personas lo apoyan`);
  }
  if (first.supported) details.push('ya lo apoyas');

  const viewHref =
    first.kind === 'request' ? `/consultas/${first.id}`
    : first.mine ? '/actividad'
    : `/mapa?capas=traffic&cerca=${point.lat.toFixed(5)},${point.lng.toFixed(5)}`;

  const actions: SimilarAction[] = [];
  if (canSupport) actions.push({ kind: 'support', requestId: first.id, label: 'Apoyarlo' });
  actions.push({ kind: 'view', href: viewHref, label: 'Ver el reporte' });
  actions.push({ kind: 'continue', label: 'Crear el mío igual' });

  return {
    title: first.mine ? 'Ya enviaste un reporte parecido aquí' : 'Ya hay un reporte parecido aquí',
    question: canSupport ? '¿Quieres apoyarlo en lugar de crear otro?' : '¿Quieres verlo en lugar de crear otro?',
    details,
    more: items.length - 1,
    actions,
  };
}
