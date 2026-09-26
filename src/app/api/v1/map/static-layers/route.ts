import { fetchStaticLayers } from '@/modules/map/server';
import { LONG_CACHE, errorResponse } from '@/lib/http';

// GET /api/v1/map/static-layers — límites municipales y trazados de rutas simplificados (§7.1).
export async function GET() {
  try {
    return Response.json(await fetchStaticLayers(), { headers: LONG_CACHE });
  } catch {
    return errorResponse(503, 'unavailable', 'Los datos no están disponibles en este momento.');
  }
}
