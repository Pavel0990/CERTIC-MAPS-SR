import { queueHealth } from '@/modules/jobs/server';
import { NO_STORE } from '@/lib/http';
import { createServiceClient } from '@/lib/supabase/admin';

// GET /api/v1/health: para el monitor externo (ARCHITECTURE.md §11.3).
// 200 si la base responde y la cola avanza; 503 si el pendiente más antiguo pasa de 10 minutos.
// Solo cifras agregadas de la cola: nada de contenido ni de usuarios.

export async function GET() {
  try {
    const q = await queueHealth(createServiceClient());
    return Response.json({ status: q.healthy ? 'ok' : 'degraded', queue: q }, { status: q.healthy ? 200 : 503, headers: NO_STORE });
  } catch {
    return Response.json({ status: 'down' }, { status: 503, headers: NO_STORE });
  }
}
