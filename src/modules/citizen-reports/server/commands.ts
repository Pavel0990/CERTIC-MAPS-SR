import 'server-only';
import type { ServerSupabase } from '@/lib/supabase/server';
import type { RpcResult } from '@/lib/http';
import type { CitizenRequestInput } from '../schemas';

export async function createCitizenRequest(supabase: ServerSupabase, input: CitizenRequestInput) {
  const { data, error } = await supabase.rpc('create_citizen_request', {
    p_kind: input.kind,
    p_category: input.category,
    p_title: input.title,
    p_description: input.description,
    p_idempotency_key: input.idempotencyKey,
    p_lat: input.lat,
    p_lng: input.lng,
    p_municipality_id: input.municipalityId,
  });
  if (error) throw new Error(`create_citizen_request: ${error.message}`);
  return data as unknown as RpcResult;
}

export async function toggleVote(supabase: ServerSupabase, requestId: string) {
  const { data, error } = await supabase.rpc('toggle_request_vote', { p_request_id: requestId });
  if (error) throw new Error(`toggle_request_vote: ${error.message}`);
  return data as unknown as RpcResult;
}

export async function changeRequestStatus(supabase: ServerSupabase, id: string, expected: string, to: string, note?: string) {
  const { data, error } = await supabase.rpc('change_request_status', { p_id: id, p_expected_status: expected, p_to: to, p_note: note || undefined });
  if (error) throw new Error(`change_request_status: ${error.message}`);
  return data as unknown as RpcResult;
}

export async function assignRequest(supabase: ServerSupabase, id: string, assignee: string) {
  const { data, error } = await supabase.rpc('assign_request', { p_id: id, p_assignee: assignee });
  if (error) throw new Error(`assign_request: ${error.message}`);
  return data as unknown as RpcResult;
}

export async function setRequestPublic(supabase: ServerSupabase, id: string, isPublic: boolean) {
  const { data, error } = await supabase.rpc('set_request_public', { p_id: id, p_public: isPublic });
  if (error) throw new Error(`set_request_public: ${error.message}`);
  return data as unknown as RpcResult;
}
