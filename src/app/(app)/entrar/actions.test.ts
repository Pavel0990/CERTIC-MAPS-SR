import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HUMAN_CHECK } from '@/lib/vocabulary';

// requestAccess entrega el token del captcha a Supabase Auth (quien lo valida) y verifyCode no lo necesita.
const auth = { signInWithOtp: vi.fn(), verifyOtp: vi.fn() };
const env = { NEXT_PUBLIC_APP_URL: 'https://app.test', NEXT_PUBLIC_TURNSTILE_SITE_KEY: undefined as string | undefined };
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ auth }) }));
vi.mock('@/config/env', () => ({ publicEnv: env }));
vi.mock('next/navigation', () => ({ redirect: vi.fn() }));

const { requestAccess, verifyCode } = await import('./actions');

const form = (fields: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
};

describe('requestAccess y el captcha', () => {
  beforeEach(() => {
    auth.signInWithOtp.mockReset().mockResolvedValue({ error: null });
    auth.verifyOtp.mockReset().mockResolvedValue({ error: null });
    env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = undefined;
  });

  it('sin clave de Turnstile funciona como siempre (sin token)', async () => {
    const r = await requestAccess({ step: 'email' }, form({ email: 'Ana@Example.com', next: '/' }));
    expect(r).toEqual({ step: 'code', email: 'ana@example.com' });
    expect(auth.signInWithOtp.mock.calls[0]?.[0].options.captchaToken).toBeUndefined();
  });

  it('con clave, pasa el token del recuadro a Supabase como captchaToken', async () => {
    env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = '1x00000000000000000000AA';
    await requestAccess({ step: 'email' }, form({ email: 'ana@example.com', captchaToken: 'XXXX.DUMMY.TOKEN.XXXX' }));
    expect(auth.signInWithOtp.mock.calls[0]?.[0].options.captchaToken).toBe('XXXX.DUMMY.TOKEN.XXXX');
  });

  it('con clave y sin token, pide esperar y no llama a Supabase', async () => {
    env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = '1x00000000000000000000AA';
    const r = await requestAccess({ step: 'email' }, form({ email: 'ana@example.com' }));
    expect(r.error).toBe(HUMAN_CHECK.waiting);
    expect(auth.signInWithOtp).not.toHaveBeenCalled();
  });

  it('si Supabase rechaza el captcha, lo dice en lenguaje simple', async () => {
    env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = '1x00000000000000000000AA';
    auth.signInWithOtp.mockResolvedValue({ error: { code: 'captcha_failed', status: 400 } });
    const r = await requestAccess({ step: 'email' }, form({ email: 'ana@example.com', captchaToken: 'usado' }));
    expect(r).toEqual({ step: 'email', email: 'ana@example.com', error: HUMAN_CHECK.rejected });
  });

  it('verifyCode no envía token de captcha (Supabase no lo exige en /verify)', async () => {
    env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = '1x00000000000000000000AA';
    await verifyCode({ step: 'code' }, form({ email: 'ana@example.com', token: '123456' }));
    expect(auth.verifyOtp).toHaveBeenCalledWith({ email: 'ana@example.com', token: '123456', type: 'email' });
  });
});
