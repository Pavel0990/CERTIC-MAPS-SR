import type { NextConfig } from 'next';

const supabaseHost = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://example.supabase.co').host;

// Cabeceras de seguridad (ARCHITECTURE.md §10.7). La CSP con nonce por request la aplica src/proxy.ts.
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'geolocation=(self), camera=(self), microphone=(), payment=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
];

// Solo en desarrollo: permitir abrir el servidor local desde un túnel de VS Code (Puertos → Reenviar,
// dominio *.devtunnels.ms) para probar en el teléfono. En producción no se agrega ningún origen.
const isDev = process.env.NODE_ENV === 'development';
const DEV_TUNNELS = ['**.devtunnels.ms'];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  ...(isDev && {
    allowedDevOrigins: DEV_TUNNELS,
    experimental: { serverActions: { allowedOrigins: DEV_TUNNELS } },
  }),
  images: {
    remotePatterns: [{ protocol: 'https', hostname: supabaseHost, pathname: '/storage/v1/object/public/**' }],
  },
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      // El service worker siempre se revisa en la red: si quedara en caché, una corrección tardaría días en llegar
      { source: '/sw.js', headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }] },
    ];
  },
};

export default nextConfig;
