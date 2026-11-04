import { describe, expect, it, vi } from 'vitest';
import { checkSimilarReports, parseSimilarItems, similarNotice, supportSimilarReport, type SimilarReport } from './similar';

vi.mock('server-only', () => ({}));
const { findSimilarReports } = await import('./server/similar');

const ID = '0b7e7c3e-6f1a-4c8e-9d38-2f8a1c5b9e01';
const ID2 = '5d2f3a10-8c4b-4e7f-a1d2-9b0c7e6f5a43';
const POINT = { lat: 19.4752, lng: -71.3412 };
const input = { kind: 'incident' as const, type: 'alumbrado', ...POINT };
const request = (over: Partial<SimilarReport> = {}): SimilarReport => ({
  id: ID, kind: 'request', type: 'alumbrado', distance_m: 42, mine: false, support_count: 3, can_support: true, supported: false, ...over,
});
const traffic = (over: Partial<SimilarReport> = {}): SimilarReport => ({ id: ID2, kind: 'traffic', type: 'bache', distance_m: 18, mine: false, ...over });
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('checkSimilarReports: nunca frena ni rompe el asistente', () => {
  it('devuelve los reportes parecidos cuando la ruta responde', async () => {
    const fetchImpl = vi.fn(async () => json({ status: 'ok', items: [request()] }));
    expect(await checkSimilarReports(input, { fetchImpl })).toEqual([request()]);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/v1/reports/similar');
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual(input);
  });

  it('sin aviso si la RPC no existe todavía o falla (la ruta responde vacío o con error)', async () => {
    expect(await checkSimilarReports(input, { fetchImpl: async () => json({ status: 'ok', items: [] }) })).toEqual([]);
    expect(await checkSimilarReports(input, { fetchImpl: async () => json({ error: { code: 'x' } }, 503) })).toEqual([]);
    expect(await checkSimilarReports(input, { fetchImpl: async () => json({ status: 'rejected', reason: 'rate_limited' }, 429) })).toEqual([]);
    expect(await checkSimilarReports(input, { fetchImpl: async () => new Response('<html>', { status: 200 }) })).toEqual([]);
    expect(await checkSimilarReports(input, { fetchImpl: async () => { throw new TypeError('Failed to fetch'); } })).toEqual([]);
  });

  it('sin aviso si tarda más del tiempo máximo: no espera la respuesta y la cancela', async () => {
    let aborted = false;
    const slow: typeof fetch = (_url, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => { aborted = true; reject(new DOMException('aborted', 'AbortError')); });
      });
    const started = Date.now();
    expect(await checkSimilarReports(input, { fetchImpl: slow, timeoutMs: 50 })).toEqual([]);
    expect(Date.now() - started).toBeLessThan(1000);
    expect(aborted).toBe(true);
  });

  it('ignora respuestas con forma inesperada y nunca muestra más de 3', () => {
    expect(parseSimilarItems({ status: 'ok', items: [{ id: 'no-es-uuid' }] })).toEqual([]);
    expect(parseSimilarItems(null)).toEqual([]);
    const four = Array.from({ length: 4 }, (_, i) => request({ distance_m: i * 10 }));
    expect(parseSimilarItems({ status: 'ok', items: four })).toHaveLength(3);
  });
});

describe('findSimilarReports (servidor): la RPC puede no existir todavía en la base', () => {
  const client = (result: unknown) => {
    const rpc = vi.fn(() => ({ abortSignal: () => result }));
    return { rpc, supabase: { rpc } as unknown as Parameters<typeof findSimilarReports>[0] };
  };

  it('función inexistente (PGRST202) → lista vacía, sin lanzar', async () => {
    const { supabase } = client(Promise.resolve({ data: null, error: { code: 'PGRST202', message: 'Could not find the function public.find_similar_reports' } }));
    expect(await findSimilarReports(supabase, input)).toEqual([]);
  });

  it('cualquier otro error o rechazo → lista vacía', async () => {
    expect(await findSimilarReports(client(Promise.reject(new Error('red'))).supabase, input)).toEqual([]);
    expect(await findSimilarReports(client(Promise.resolve({ data: { status: 'rejected', reason: 'rate_limited' }, error: null })).supabase, input)).toEqual([]);
  });

  it('con resultados, pasa los parámetros de la RPC y devuelve los reportes', async () => {
    const { supabase, rpc } = client(Promise.resolve({ data: { status: 'ok', items: [request()] }, error: null }));
    expect(await findSimilarReports(supabase, input)).toEqual([request()]);
    expect(rpc).toHaveBeenCalledWith('find_similar_reports', { p_kind: 'incident', p_type: 'alumbrado', p_lat: POINT.lat, p_lng: POINT.lng });
  });
});

describe('similarNotice: qué dice el aviso y qué hace cada botón', () => {
  it('sin resultados no hay aviso', () => {
    expect(similarNotice([], 'Bache', POINT)).toBeNull();
  });

  it('reporte al municipio que se puede apoyar: "Apoyarlo", "Ver el reporte" y "Crear el mío igual"', () => {
    const m = similarNotice([request(), request({ id: ID2, distance_m: 90 })], 'Alumbrado', POINT)!;
    expect(m.title).toBe('Ya hay un reporte parecido aquí');
    expect(m.question).toBe('¿Quieres apoyarlo en lugar de crear otro?');
    expect(m.details).toEqual(['Alumbrado', 'a unos 42 m de aquí', '3 personas lo apoyan']);
    expect(m.more).toBe(1);
    expect(m.actions).toEqual([
      { kind: 'support', requestId: ID, label: 'Apoyarlo' },
      { kind: 'view', href: `/consultas/${ID}`, label: 'Ver el reporte' },
      { kind: 'continue', label: 'Crear el mío igual' },
    ]);
  });

  it('si ya lo apoya o es suyo, no ofrece "Apoyarlo" (el voto es un interruptor y lo quitaría)', () => {
    const voted = similarNotice([request({ supported: true })], 'Alumbrado', POINT)!;
    expect(voted.actions.map((a) => a.kind)).toEqual(['view', 'continue']);
    expect(voted.details).toContain('ya lo apoyas');
    const mine = similarNotice([request({ mine: true, can_support: false })], 'Alumbrado', POINT)!;
    expect(mine.title).toBe('Ya enviaste un reporte parecido aquí');
    expect(mine.actions.map((a) => a.kind)).toEqual(['view', 'continue']);
  });

  it('alerta de tránsito: "Ver el reporte" abre el mapa de cerca en ese lugar (las propias, en Mi actividad)', () => {
    const t = similarNotice([traffic()], 'Bache', POINT)!;
    expect(t.question).toBe('¿Quieres verlo en lugar de crear otro?');
    expect(t.actions).toEqual([
      { kind: 'view', href: '/mapa?capas=traffic&cerca=19.47520,-71.34120', label: 'Ver el reporte' },
      { kind: 'continue', label: 'Crear el mío igual' },
    ]);
    expect(similarNotice([traffic({ mine: true })], 'Bache', POINT)!.actions[0]).toMatchObject({ href: '/actividad' });
  });
});

describe('supportSimilarReport: "Apoyarlo" usa la acción de voto que ya existe', () => {
  it('suma el apoyo con POST /api/v1/requests/:id/vote', async () => {
    const fetchImpl = vi.fn(async () => json({ status: 'ok', voted: true, support_count: 4 }));
    expect(await supportSimilarReport(ID, fetchImpl)).toEqual({ ok: true, supportCount: 4 });
    expect(fetchImpl).toHaveBeenCalledWith(`/api/v1/requests/${ID}/vote`, { method: 'POST' });
  });

  it('si ya lo había apoyado en otra pantalla (el toque lo quitó), lo vuelve a poner', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(json({ status: 'ok', voted: false, support_count: 3 }))
      .mockResolvedValueOnce(json({ status: 'ok', voted: true, support_count: 4 }));
    expect(await supportSimilarReport(ID, fetchImpl)).toEqual({ ok: true, supportCount: 4 });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('un rechazo o la falta de señal se informan sin lanzar', async () => {
    expect(await supportSimilarReport(ID, async () => json({ status: 'rejected', reason: 'rate_limited' }, 429))).toEqual({ ok: false, reason: 'rate_limited' });
    expect(await supportSimilarReport(ID, async () => { throw new TypeError('Failed to fetch'); })).toEqual({ ok: false, reason: 'unavailable' });
  });
});
