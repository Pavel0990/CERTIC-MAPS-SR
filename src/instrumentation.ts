import type { Instrumentation } from 'next';
import { errorRecord, parseDsn, sentryEnvelope } from '@/lib/error-report';

// Errores del servidor (Server Components, Route Handlers, Server Actions y proxy) — ARCHITECTURE.md §13.6.
// Siempre: una línea JSON en los registros de Vercel. Si existe SENTRY_DSN: también a Sentry por HTTP.
// No se envían cabeceras, cookies, cuerpo ni query string (src/lib/error-report.ts).
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  const rec = errorRecord(err, { path: request.path, method: request.method, routePath: context.routePath, routeType: context.routeType });
  console.error(JSON.stringify({ msg: 'request_error', ...rec, stack: undefined }));

  const sentry = parseDsn(process.env.SENTRY_DSN);
  if (!sentry) return;
  try {
    await fetch(sentry.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-sentry-envelope',
        'X-Sentry-Auth': `Sentry sentry_version=7, sentry_key=${sentry.key}, sentry_client=sr-conecta/1.0`,
      },
      body: sentryEnvelope(rec, sentry.dsn),
      signal: AbortSignal.timeout(3000),
    });
  } catch {
    // Si Sentry no responde, el error ya quedó en los registros de Vercel
  }
};
