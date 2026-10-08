import { z } from 'zod';

// Variables públicas: se incrustan en el cliente en tiempo de build (prefijo NEXT_PUBLIC_).
// Next.js solo las reemplaza si se leen por su nombre completo, por eso se listan una a una.
const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
  NEXT_PUBLIC_APP_URL: z.url().default('http://localhost:3000'),
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().optional(),
});

export const publicEnv = publicSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || undefined,
});

export const APP_TIMEZONE = 'America/Santo_Domingo';

/** Centro y encuadre por defecto del mapa: provincia Santiago Rodríguez. */
export const PROVINCE_VIEW = {
  center: { lat: 19.43, lng: -71.3 },
  zoom: 10.2,
  bounds: { minLng: -71.62, minLat: 19.24, maxLng: -71.02, maxLat: 19.62 },
} as const;
