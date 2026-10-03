import 'server-only';
import type { ServerSupabase } from '@/lib/supabase/server';
import type { RpcResult } from '@/lib/http';
import type { PlaceProposalInput, PlaceUpdateInput } from '../schemas';

export async function proposePlace(supabase: ServerSupabase, input: PlaceProposalInput) {
  const { data, error } = await supabase.rpc('propose_place', {
    p_name: input.name,
    p_kind: input.kind,
    p_lat: input.lat,
    p_lng: input.lng,
    p_description: input.description,
  });
  if (error) throw new Error(`propose_place: ${error.message}`);
  return data as unknown as RpcResult;
}

export async function updatePlace(supabase: ServerSupabase, input: PlaceUpdateInput) {
  const { id, version, ...changes } = input;
  const { data, error } = await supabase.rpc('update_place', { p_id: id, p_version: version, p_changes: changes });
  if (error) throw new Error(`update_place: ${error.message}`);
  return data as unknown as RpcResult;
}
