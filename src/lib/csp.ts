// CSP estricta con nonce (ARCHITECTURE.md §10.7). La aplica src/proxy.ts en cada request.

/** Origen de Cloudflare Turnstile (captcha de /entrar). */
const TURNSTILE_ORIGIN = 'https://challenges.cloudflare.com';

interface CspOptions {
  nonce: string;
  /** Host de Supabase (API, Storage y Realtime). */
  supabaseHost: string;
  isDev: boolean;
  /** Con el captcha activado se permite Turnstile: su script y su iframe. */
  captcha: boolean;
}

export function contentSecurityPolicy({ nonce, supabaseHost, isDev, captcha }: CspOptions) {
  // Turnstile (developers.cloudflare.com/turnstile/reference/content-security-policy): script-src y frame-src.
  // Su script se carga con el nonce y 'strict-dynamic'; el origen en script-src solo sirve a navegadores
  // que no entienden 'strict-dynamic'. No hace falta connect-src (no usamos pre-clearance).
  // Va en todas las pantallas, no solo en /entrar: al navegar dentro de la app la CSP es la del primer documento.
  const turnstile = captcha ? ` ${TURNSTILE_ORIGIN}` : '';
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${turnstile}${isDev ? " 'unsafe-eval'" : ''}`,
    // React serializa atributos style en el HTML; un nonce no los cubre. No ejecutan código.
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: https://${supabaseHost} https://tiles.openfreemap.org`,
    "font-src 'self' data:",
    `connect-src 'self' https://${supabaseHost} wss://${supabaseHost} https://tiles.openfreemap.org`,
    ...(captcha ? [`frame-src ${TURNSTILE_ORIGIN}`] : []),
    "worker-src 'self' blob:",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    ...(isDev ? [] : ['upgrade-insecure-requests']),
  ].join('; ');
}
