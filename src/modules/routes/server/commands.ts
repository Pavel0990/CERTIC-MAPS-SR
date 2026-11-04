import 'server-only';
import type { Json } from '@/types/database';
import type { ServerSupabase } from '@/lib/supabase/server';
import { asRpcResult } from '@/lib/rpc';
import type { RouteProposalInput, RouteUpdateInput } from '../schemas';

export async function proposeRoute(supabase: ServerSupabase, input: RouteProposalInput) {
  return asRpcResult('propose_route', await supabase.rpc('propose_route', {
    p_name: input.name,
    p_kind: input.kind,
    p_difficulty: input.difficulty,
    p_duration_min: input.durationMin,
    p_geojson: input.geojson as unknown as Json,
    p_description: input.description,
  }));
}

export async function updateRoute(supabase: ServerSupabase, input: RouteUpdateInput) {
  const { id, version, ...changes } = input;
  return asRpcResult('update_route', await supabase.rpc('update_route', { p_id: id, p_version: version, p_changes: changes }));
}
