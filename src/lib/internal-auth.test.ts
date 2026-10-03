import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
const { hasBearer } = await import('./internal-auth');

const req = (auth?: string) => new Request('http://x/api', { headers: auth ? { authorization: auth } : {} });
const SECRET = 'a'.repeat(43);

describe('hasBearer (endpoints internos)', () => {
  it('acepta solo el secreto exacto', () => {
    expect(hasBearer(req(`Bearer ${SECRET}`), SECRET)).toBe(true);
    expect(hasBearer(req(`Bearer ${SECRET}x`), SECRET)).toBe(false);
    expect(hasBearer(req(`Bearer ${SECRET.slice(1)}`), SECRET)).toBe(false);
  });
  it('rechaza sin cabecera, con otro esquema o con secreto vacío', () => {
    expect(hasBearer(req(), SECRET)).toBe(false);
    expect(hasBearer(req(`Basic ${SECRET}`), SECRET)).toBe(false);
    expect(hasBearer(req('Bearer '), '')).toBe(false);
  });
});
