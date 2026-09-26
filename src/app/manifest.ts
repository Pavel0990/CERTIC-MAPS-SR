import type { MetadataRoute } from 'next';

// Manifiesto de la PWA (ARCHITECTURE.md §6.4). Se sirve en /manifest.webmanifest.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SR Conecta',
    short_name: 'SR Conecta',
    description: 'Santiago Rodríguez en un solo mapa: turismo, negocios, rutas, tránsito en vivo y reportes al municipio.',
    lang: 'es-DO',
    start_url: '/mapa',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f3f4f6',
    theme_color: '#111418',
    categories: ['navigation', 'travel', 'government'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Reportar un problema', short_name: 'Reportar', url: '/reportar' },
      { name: 'Mi actividad', short_name: 'Actividad', url: '/actividad' },
    ],
  };
}
