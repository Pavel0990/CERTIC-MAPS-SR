import type { MetadataRoute } from 'next';
import { publicEnv } from '@/config/env';

// /robots.txt: los buscadores indexan solo lo público; lo personal, el panel y la API quedan fuera.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin', '/perfil', '/actividad', '/notificaciones', '/consultas', '/proponer', '/reportar',
        '/negocio/', '/negocios/registrar', '/entrar', '/sin-permiso', '/offline', '/auth/', '/api/',
      ],
    },
    sitemap: `${publicEnv.NEXT_PUBLIC_APP_URL}/sitemap.xml`,
  };
}
