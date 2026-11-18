import type { MetadataRoute } from 'next';

// Manifiesto de la PWA (ARCHITECTURE.md §6.4). Se sirve en /manifest.webmanifest.
export default function manifest(): MetadataRoute.Manifest {
  return {
    // Identidad fija de la app instalada. Es la misma que el navegador ya calculaba (start_url), así que los
    // teléfonos que la tienen instalada la siguen reconociendo aunque cambie start_url.
    id: '/mapa',
    name: 'SR Conecta',
    short_name: 'SR Conecta',
    description: 'Santiago Rodríguez en un solo mapa: turismo, negocios, rutas, tránsito en vivo y reportes al municipio.',
    lang: 'es-DO',
    start_url: '/mapa',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f3f4f6',
    theme_color: '#1d4ed8',
    categories: ['navigation', 'travel', 'government'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    // Android las muestra en la ventana de instalación, como una ficha de tienda. Se generan con scripts/pwa-assets.mjs
    screenshots: [
      { src: '/screenshots/mapa.jpg', sizes: '780x1688', type: 'image/jpeg', form_factor: 'narrow', label: 'Mapa de la provincia con lugares, negocios y rutas' },
      { src: '/screenshots/ruta.jpg', sizes: '780x1688', type: 'image/jpeg', form_factor: 'narrow', label: 'Ruta con su trazado, distancia y cómo llegar' },
      { src: '/screenshots/turismo.jpg', sizes: '780x1688', type: 'image/jpeg', form_factor: 'narrow', label: 'Lugares para visitar en los tres municipios' },
      { src: '/screenshots/mapa-ancho.jpg', sizes: '1366x768', type: 'image/jpeg', form_factor: 'wide', label: 'Mapa en la computadora' },
    ],
    shortcuts: [
      { name: 'Reportar un problema', short_name: 'Reportar', url: '/reportar' },
      { name: 'Mi actividad', short_name: 'Actividad', url: '/actividad' },
    ],
  };
}
