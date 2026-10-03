import 'server-only';
import type { Json } from '@/types/database';
import type { ServerSupabase } from '@/lib/supabase/server';
import type { RpcResult } from '@/lib/http';
import type { RouteProposalInput, RouteUpdateInput } from '../schemas';

export async function proposeRoute(supabase: ServerSupabase, input: RouteProposalInput) {
  const { data, error } = await supabase.rpc('propose_route', {
    p_name: input.name,
    p_kind: input.kind,
    p_difficulty: input.difficulty,
    p_duration_min: input.durationMin,
    p_geojson: input.geojson as unknown as Json,
    p_description: input.description,
  });
  if (error) throw new Error(`propose_route: ${error.message}`);
  return data as unknown as RpcResult;
}

export async function updateRoute(supabase: ServerSupabase, input: RouteUpdateInput) {
  const { id, version, ...changes } = input;
  const { data, error } = await supabase.rpc('update_route', { p_id: id, p_version: version, p_changes: changes });
  if (error) throw new Error(`update_route: ${error.message}`);
  return data as unknown as RpcResult;
}
