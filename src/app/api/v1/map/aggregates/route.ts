import { fetchAggregates } from '@/modules/map/server';
import { PUBLIC_CACHE, errorResponse } from '@/lib/http';

// GET /api/v1/map/aggregates — conteos públicos por municipio para el zoom de provincia (§7.2).
export async function GET() {
  try {
    return Response.json(await fetchAggregates(), { headers: PUBLIC_CACHE });
  } catch {
    return errorResponse(503, 'unavailable', 'Los datos no están disponibles en este momento.');
  }
}
