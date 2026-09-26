import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { ALL_LAYERS, type LayerId } from '@/modules/map';
import { fetchFeatures } from '@/modules/map/server';
import { PUBLIC_CACHE, errorResponse, rpcResponse } from '@/lib/http';

// GET /api/v1/map/features?bbox=minLng,minLat,maxLng,maxLat&layers=business,tourism
// Público y anónimo: ignora cookies y se cachea 30 s en CDN (ARCHITECTURE.md §12).
const query = z.object({
  bbox: z.string().transform((s) => s.split(',').map(Number)).pipe(z.tuple([
    z.number().min(-180).max(180), z.number().min(-90).max(90), z.number().min(-180).max(180), z.number().min(-90).max(90),
  ])),
  layers: z.string().optional().transform((s) => (s ? s.split(',') : ALL_LAYERS)).pipe(z.array(z.enum(ALL_LAYERS as [LayerId, ...LayerId[]]))),
});

export async function GET(request: NextRequest) {
  const parsed = query.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) return errorResponse(400, 'invalid_query', 'Parámetros bbox o layers inválidos.');
  const [minLng, minLat, maxLng, maxLat] = parsed.data.bbox;
  try {
    const result = await fetchFeatures({ minLng, minLat, maxLng, maxLat }, parsed.data.layers);
    if ('status' in result) return rpcResponse(result);
    return Response.json(result, { headers: PUBLIC_CACHE });
  } catch {
    return errorResponse(503, 'unavailable', 'El mapa no está disponible en este momento.');
  }
}
