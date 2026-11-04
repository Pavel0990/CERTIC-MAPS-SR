// Foto de perfil: una por persona en avatars/{uid}.webp (migración 20261020120000_profile_avatars).
// Seguro para el cliente y el servidor: solo arma la URL pública.
import { publicEnv } from '@/config/env';

export const AVATAR_BUCKET = 'avatars';
/** Lado del cuadrado en píxeles: nítido hasta 128 px en pantallas de densidad 2 (el máximo que se muestra). */
export const AVATAR_SIZE = 256;

export const avatarPath = (userId: string) => `${userId}.webp`;

/**
 * URL pública de la foto, o null si la persona no tiene. La versión cambia en cada foto nueva:
 * el archivo se cachea un año en la CDN y el navegador, y una foto nueva es una URL nueva.
 */
export function avatarUrl(userId: string, version: number | null | undefined) {
  if (!version) return null;
  return `${publicEnv.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${AVATAR_BUCKET}/${avatarPath(userId)}?v=${version}`;
}
