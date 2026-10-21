import { describe, expect, it } from 'vitest';
import { isSameOrigin } from './same-origin';

const req = (headers: Record<string, string>) =>
  new Request('https://sr-conecta.vercel.app/api/v1/reports', { method: 'POST', headers: { host: 'sr-conecta.vercel.app', ...headers } });

describe('isSameOrigin (defensa CSRF de la API)', () => {
  it('acepta peticiones de la propia web', () => {
    expect(isSameOrigin(req({ origin: 'https://sr-conecta.vercel.app' }))).toBe(true);
  });
  it('acepta clientes que no son un navegador (sin Origin ni Sec-Fetch-Site)', () => {
    expect(isSameOrigin(req({}))).toBe(true);
  });
  it.each(['https://evil.com', 'https://sr-conecta.vercel.app.evil.com', 'http://sr-conecta.vercel.app:8080', 'null'])('rechaza el origen %s', (origin) => {
    expect(isSameOrigin(req({ origin }))).toBe(false);
  });
  it('rechaza una petición sin Origin que el navegador marca como de otro sitio', () => {
    expect(isSameOrigin(req({ 'sec-fetch-site': 'cross-site' }))).toBe(false);
  });
});
