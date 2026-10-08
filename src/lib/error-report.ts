// Informe de errores del servidor (ARCHITECTURE.md §13.6). Sin dependencias: lo usa src/instrumentation.ts.
// Privacidad: solo la ruta SIN query string (podría llevar códigos o tokens), el método y el tipo de ruta.
// Nunca cabeceras, cookies ni cuerpo de la petición.

export interface ErrorContext {
  path: string;
  method: string;
  routePath?: string;
  routeType?: string;
}

export interface ErrorRecord {
  level: 'error';
  message: string;
  digest?: string;
  name: string;
  path: string;
  method: string;
  route?: string;
  routeType?: string;
  release?: string;
  environment: string;
  stack?: string;
}

export function errorRecord(err: unknown, ctx: ErrorContext, env: Record<string, string | undefined> = process.env): ErrorRecord {
  const e = err instanceof Error ? err : new Error(String(err));
  const digest = typeof err === 'object' && err !== null && 'digest' in err ? String((err as { digest: unknown }).digest) : undefined;
  return {
    level: 'error',
    message: e.message.slice(0, 1000),
    digest,
    name: e.name,
    path: ctx.path.split('?')[0]!.slice(0, 300),
    method: ctx.method,
    route: ctx.routePath,
    routeType: ctx.routeType,
    release: env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12),
    environment: env.VERCEL_ENV ?? env.NODE_ENV ?? 'development',
    stack: e.stack?.split('\n').slice(0, 15).join('\n'),
  };
}

/** DSN de Sentry → URL del endpoint de envelopes y clave pública. null si el DSN no es válido. */
export function parseDsn(dsn: string | undefined) {
  if (!dsn) return null;
  const m = /^https:\/\/([a-f0-9]+)@([^/]+)\/(\d+)$/.exec(dsn.trim());
  if (!m) return null;
  return { url: `https://${m[2]}/api/${m[3]}/envelope/`, key: m[1]!, dsn: dsn.trim() };
}

/** Envelope de Sentry (formato HTTP oficial, sin SDK) para un error. */
export function sentryEnvelope(rec: ErrorRecord, dsn: string, now = new Date()) {
  const eventId = crypto.randomUUID().replace(/-/g, '');
  const event = {
    event_id: eventId,
    timestamp: now.getTime() / 1000,
    platform: 'javascript',
    level: 'error',
    logger: 'next.onRequestError',
    environment: rec.environment,
    release: rec.release,
    transaction: rec.route ?? rec.path,
    tags: { route_type: rec.routeType ?? 'unknown', method: rec.method, digest: rec.digest ?? '' },
    request: { url: rec.path, method: rec.method },
    exception: { values: [{ type: rec.name, value: rec.message }] },
    extra: { stack: rec.stack },
  };
  return [JSON.stringify({ event_id: eventId, dsn, sent_at: now.toISOString() }), JSON.stringify({ type: 'event' }), JSON.stringify(event)].join('\n');
}
