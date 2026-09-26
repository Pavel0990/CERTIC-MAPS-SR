import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Proxy (Next 16). Hace tres cosas, ninguna de autorización (ARCHITECTURE.md §10.1):
//   1. Genera un nonce por request y aplica la CSP estricta (§10.7): scripts solo con nonce.
//   2. Refresca la sesión de Supabase (cookies).
//   3. Redirige a /entrar las rutas que requieren sesión. Cada página, acción y RPC vuelve a verificar.
const PROTECTED = ['/actividad', '/perfil', '/notificaciones', '/reportar', '/negocio', '/admin', '/proponer', '/negocios/registrar'];

function contentSecurityPolicy(nonce: string) {
  const supabase = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).host;
  const isDev = process.env.NODE_ENV === 'development';
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`,
    // React serializa atributos style en el HTML; un nonce no los cubre. No ejecutan código.
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: https://${supabase} https://tiles.openfreemap.org https://*.googleapis.com https://*.gstatic.com`,
    "font-src 'self' data:",
    `connect-src 'self' https://${supabase} wss://${supabase} https://tiles.openfreemap.org https://*.googleapis.com`,
    "worker-src 'self' blob:",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    ...(isDev ? [] : ['upgrade-insecure-requests']),
  ].join('; ');
}

export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const csp = contentSecurityPolicy(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);

  const build = () => {
    const r = NextResponse.next({ request: { headers: requestHeaders } });
    r.headers.set('Content-Security-Policy', csp);
    return r;
  };
  let response = build();

  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (items) => {
        for (const { name, value } of items) request.cookies.set(name, value);
        response = build();
        for (const { name, value, options } of items) response.cookies.set(name, value, options);
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const path = request.nextUrl.pathname;
  if (!data?.claims && PROTECTED.some((p) => path === p || path.startsWith(p + '/'))) {
    const url = request.nextUrl.clone();
    url.pathname = '/entrar';
    url.search = `?next=${encodeURIComponent(path + request.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: [
    {
      source: '/((?!api/|_next/static|_next/image|vendor/|favicon.ico|icons/|manifest.webmanifest|sw.js|robots.txt).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
