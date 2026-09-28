/**
 * Destino seguro después de iniciar sesión: solo rutas internas (sin open redirect, §10.1).
 * Rechaza URLs absolutas, protocolo relativo (//evil.com) y barras invertidas.
 */
export function safeNext(next: string | null | undefined, fallback = '/') {
  if (!next || typeof next !== 'string') return fallback;
  if (!next.startsWith('/') || next.startsWith('//') || next.includes('\\') || next.includes('\0')) return fallback;
  try {
    const u = new URL(next, 'http://interno.local');
    if (u.origin !== 'http://interno.local') return fallback;
    return u.pathname + u.search + u.hash;
  } catch {
    return fallback;
  }
}
