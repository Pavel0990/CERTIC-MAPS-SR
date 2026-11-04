import { describe, expect, it } from 'vitest';
import { errorRecord, parseDsn, sentryEnvelope } from './error-report';

describe('informe de errores del servidor', () => {
  it('nunca guarda la query string (puede llevar códigos o tokens)', () => {
    const r = errorRecord(new Error('falló'), { path: '/auth/callback?code=SECRETO&next=/x', method: 'GET', routePath: '/auth/callback', routeType: 'route' }, {});
    expect(r.path).toBe('/auth/callback');
    expect(JSON.stringify(r)).not.toContain('SECRETO');
    expect(r.environment).toBe('development');
  });

  it('acepta errores que no son Error y conserva el digest de React', () => {
    const r = errorRecord(Object.assign(new Error('x'), { digest: '123' }), { path: '/', method: 'POST' }, { VERCEL_ENV: 'production', VERCEL_GIT_COMMIT_SHA: 'abcdef1234567890' });
    expect(r.digest).toBe('123');
    expect(r.release).toBe('abcdef123456');
    expect(errorRecord('texto', { path: '/', method: 'GET' }, {}).message).toBe('texto');
  });

  it('convierte el DSN de Sentry y rechaza los inválidos', () => {
    expect(parseDsn('https://abc123@o1.ingest.sentry.io/42')).toEqual({ url: 'https://o1.ingest.sentry.io/api/42/envelope/', key: 'abc123', dsn: 'https://abc123@o1.ingest.sentry.io/42' });
    expect(parseDsn('http://abc@host/1')).toBeNull();
    expect(parseDsn(undefined)).toBeNull();
  });

  it('el envelope tiene cabecera, tipo y evento, sin datos de la petición más allá de la ruta', () => {
    const rec = errorRecord(new Error('boom'), { path: '/negocios?q=juan', method: 'GET', routeType: 'render' }, {});
    const [head, type, event] = sentryEnvelope(rec, 'https://k@h/1').split('\n').map((l) => JSON.parse(l));
    expect(head.dsn).toBe('https://k@h/1');
    expect(type).toEqual({ type: 'event' });
    expect(event.exception.values[0]).toEqual({ type: 'Error', value: 'boom' });
    expect(event.request).toEqual({ url: '/negocios', method: 'GET' });
  });
});
