import 'server-only';
import type { ServerSupabase } from '@/lib/supabase/server';
import { SIMILAR_TIMEOUT_MS, parseSimilarItems, type SimilarReport, type SimilarReportsInput } from '../similar';

/**
 * Reportes abiertos del mismo tipo a menos de 150 m (RPC find_similar_reports, DATABASE.md §5.23), con el JWT del usuario.
 * Nunca lanza: si la función todavía no existe en la base (migración sin aplicar), si hay un error o un rechazo
 * (p. ej. el límite de 60 por hora), devuelve una lista vacía y el asistente sigue sin aviso.
 */
export async function findSimilarReports(supabase: ServerSupabase, input: SimilarReportsInput): Promise<SimilarReport[]> {
  try {
    const { data, error } = await supabase.rpc('find_similar_reports', {
      p_kind: input.kind,
      p_type: input.type,
      p_lat: input.lat,
      p_lng: input.lng,
    }).abortSignal(AbortSignal.timeout(SIMILAR_TIMEOUT_MS));
    if (error) return [];
    return parseSimilarItems(data);
  } catch {
    return [];
  }
}
