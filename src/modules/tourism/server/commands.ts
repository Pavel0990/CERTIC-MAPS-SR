import 'server-only';
import type { ServerSupabase } from '@/lib/supabase/server';
import { asRpcResult } from '@/lib/rpc';
import type { PlaceProposalInput, PlaceUpdateInput } from '../schemas';

export async function proposePlace(supabase: ServerSupabase, input: PlaceProposalInput) {
  return asRpcResult('propose_place', await supabase.rpc('propose_place', {
    p_name: input.name,
    p_kind: input.kind,
    p_lat: input.lat,
    p_lng: input.lng,
    p_description: input.description,
  }));
}

export async function updatePlace(supabase: ServerSupabase, input: PlaceUpdateInput) {
  const { id, version, ...changes } = input;
  return asRpcResult('update_place', await supabase.rpc('update_place', { p_id: id, p_version: version, p_changes: changes }));
}
