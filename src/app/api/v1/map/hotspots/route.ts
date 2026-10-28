import { fetchHotspots } from '@/modules/map/server';
import { errorResponse } from '@/lib/http';

// GET /api/v1/map/hotspots — puntos calientes de los últimos 90 días: solo conteos por cuadro de ~550 m.
// Cambia despacio: caché de 10 minutos en el CDN. 404 si la base todavía no tiene la función.
export async function GET() {
  try {
    const data = await fetchHotspots();
    if (!data) return errorResponse(404, 'not_available', 'La capa de puntos calientes todavía no está disponible.');
    return Response.json(data, { headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200' } });
  } catch {
    return errorResponse(503, 'unavailable', 'Los datos no están disponibles en este momento.');
  }
}
