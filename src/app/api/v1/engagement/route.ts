import { z } from 'zod';
import { createAnonClient } from '@/lib/supabase/anon';
import { readJson } from '@/lib/api-auth';

const body = z.object({
  entity: z.enum(['business', 'tourism_place', 'eco_route']),
  id: z.uuid(),
  metric: z.enum(['view', 'directions', 'whatsapp']),
});

// POST /api/v1/engagement — métricas diarias agregadas del comercio y turismo (track_engagement).
// Anónimo y sin identificar al visitante; el cliente cuenta una vista por ficha y sesión (§9.3).
export async function POST(request: Request) {
  const parsed = body.safeParse(await readJson(request));
  if (!parsed.success) return new Response(null, { status: 204 });
  await createAnonClient().rpc('track_engagement', { p_entity_type: parsed.data.entity, p_entity_id: parsed.data.id, p_metric: parsed.data.metric });
  return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
}
