import { describe, expect, it } from 'vitest';
import { contentSecurityPolicy } from './csp';

const directives = (csp: string) => Object.fromEntries(csp.split('; ').map((d) => [d.split(' ')[0], d]));
const base = { nonce: 'abc123', supabaseHost: 'demo.supabase.co', isDev: false };

describe('contentSecurityPolicy', () => {
  it('sin captcha no menciona a Cloudflare ni permite iframes de terceros', () => {
    const csp = contentSecurityPolicy({ ...base, captcha: false });
    expect(csp).not.toContain('cloudflare');
    expect(directives(csp)['frame-src']).toBeUndefined();
    expect(directives(csp)['script-src']).toBe("script-src 'self' 'nonce-abc123' 'strict-dynamic'");
  });

  it('con captcha permite solo el script y el iframe de Turnstile, sin perder el nonce ni strict-dynamic', () => {
    const d = directives(contentSecurityPolicy({ ...base, captcha: true }));
    expect(d['script-src']).toBe("script-src 'self' 'nonce-abc123' 'strict-dynamic' https://challenges.cloudflare.com");
    expect(d['frame-src']).toBe('frame-src https://challenges.cloudflare.com');
    expect(d['connect-src']).not.toContain('cloudflare');
    expect(d['frame-ancestors']).toBe("frame-ancestors 'none'");
    expect(d['script-src']).not.toContain('unsafe-inline');
  });

  it("'unsafe-eval' solo en desarrollo", () => {
    expect(contentSecurityPolicy({ ...base, isDev: true, captcha: true })).toContain("'unsafe-eval'");
    expect(contentSecurityPolicy({ ...base, captcha: true })).not.toContain("'unsafe-eval'");
  });
});
