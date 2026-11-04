import 'server-only';
import { createHash, timingSafeEqual } from 'node:crypto';

/**
 * ¿Trae la petición `Authorization: Bearer <secreto>`? Para los endpoints que llaman máquinas:
 * pg_net → worker (JOBS_SECRET) y Vercel Cron → informe semanal (CRON_SECRET).
 * Compara resúmenes SHA-256 en tiempo constante: ni el contenido ni la longitud se filtran por tiempo.
 */
export function hasBearer(request: Request, secret: string) {
  const header = request.headers.get('authorization') ?? '';
  if (!secret || !header.startsWith('Bearer ')) return false;
  const digest = (s: string) => createHash('sha256').update(s).digest();
  return timingSafeEqual(digest(header.slice(7)), digest(secret));
}
