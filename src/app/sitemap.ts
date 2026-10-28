import type { MetadataRoute } from 'next';
import { publicEnv } from '@/config/env';

// /sitemap.xml: las pantallas públicas que conviene que encuentren los buscadores.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = publicEnv.NEXT_PUBLIC_APP_URL;
  return [
    { url: base, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/mapa`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/negocios`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${base}/turismo`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/rutas`, changeFrequency: 'weekly', priority: 0.8 },
  ];
}
