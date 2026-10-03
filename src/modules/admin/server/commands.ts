import 'server-only';
import type { ServerSupabase } from '@/lib/supabase/server';
import type { RpcResult } from '@/lib/http';

export type ContentEntity = 'business' | 'place' | 'route' | 'promotion' | 'attachment';

/** Aprobar, rechazar, suspender o archivar contenido (review_content, compare-and-set). */
export async function reviewContent(supabase: ServerSupabase, entity: ContentEntity, id: string, expected: string, to: string, reason?: string) {
  const { data, error } = await supabase.rpc('review_content', { p_entity: entity, p_id: id, p_expected_status: expected, p_to: to, p_reason: reason || undefined });
  if (error) throw new Error(`review_content: ${error.message}`);
  return data as unknown as RpcResult;
}

export async function assignRole(supabase: ServerSupabase, userId: string, role: 'moderator' | 'municipal_admin', municipalityId: string) {
  const { data, error } = await supabase.rpc('assign_role', { p_user_id: userId, p_role: role, p_municipality_id: municipalityId });
  if (error) throw new Error(`assign_role: ${error.message}`);
  return data as unknown as RpcResult;
}

export async function revokeRole(supabase: ServerSupabase, userId: string, role: 'moderator' | 'municipal_admin', municipalityId: string) {
  const { data, error } = await supabase.rpc('revoke_role', { p_user_id: userId, p_role: role, p_municipality_id: municipalityId });
  if (error) throw new Error(`revoke_role: ${error.message}`);
  return data as unknown as RpcResult;
}

/**
 * Descarga auditada del PDF (ADR-021): registra la descarga y firma la URL con el JWT del administrador.
 * La política de Storage solo deja leer el PDF si la descarga quedó registrada.
 */
export async function authorizeReportDownload(supabase: ServerSupabase, runId: string) {
  const { data, error } = await supabase.rpc('authorize_report_download', { p_run_id: runId });
  if (error) throw new Error(`authorize_report_download: ${error.message}`);
  const r = data as unknown as RpcResult & { bucket?: string; path?: string };
  if (r.status !== 'ok' || !r.bucket || !r.path) return { status: 'rejected' as const, reason: (r as { reason?: string }).reason ?? 'not_ready' };
  const { data: signed } = await supabase.storage.from(r.bucket).createSignedUrl(r.path, 300, { download: true });
  if (!signed?.signedUrl) return { status: 'rejected' as const, reason: 'not_ready' };
  return { status: 'ok' as const, url: signed.signedUrl };
}
