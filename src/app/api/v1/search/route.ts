import { type NextRequest } from 'next/server';
import { searchPlaces } from '@/modules/map/server';
import { PUBLIC_CACHE, errorResponse } from '@/lib/http';

// GET /api/v1/search?q= — búsqueda propia de negocios, lugares y rutas (§9.1). Pública y cacheable.
export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get('q') ?? '').trim();
  if (q.length < 2 || q.length > 80) return Response.json([], { headers: PUBLIC_CACHE });
  try {
    return Response.json(await searchPlaces(q), { headers: PUBLIC_CACHE });
  } catch {
    return errorResponse(503, 'unavailable', 'La búsqueda no está disponible en este momento.');
  }
}
