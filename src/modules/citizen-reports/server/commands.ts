import 'server-only';
import type { ServerSupabase } from '@/lib/supabase/server';
import { asRpcResult } from '@/lib/rpc';
import type { CitizenRequestInput } from '../schemas';

export async function createCitizenRequest(supabase: ServerSupabase, input: CitizenRequestInput) {
  return asRpcResult('create_citizen_request', await supabase.rpc('create_citizen_request', {
    p_kind: input.kind,
    p_category: input.category,
    p_title: input.title,
    p_description: input.description,
    p_idempotency_key: input.idempotencyKey,
    p_lat: input.lat,
    p_lng: input.lng,
    p_municipality_id: input.municipalityId,
  }));
}

export async function toggleVote(supabase: ServerSupabase, requestId: string) {
  return asRpcResult('toggle_request_vote', await supabase.rpc('toggle_request_vote', { p_request_id: requestId }));
}

export async function changeRequestStatus(supabase: ServerSupabase, id: string, expected: string, to: string, note?: string) {
  return asRpcResult('change_request_status', await supabase.rpc('change_request_status', { p_id: id, p_expected_status: expected, p_to: to, p_note: note || undefined }));
}

export async function assignRequest(supabase: ServerSupabase, id: string, assignee: string) {
  return asRpcResult('assign_request', await supabase.rpc('assign_request', { p_id: id, p_assignee: assignee }));
}

export async function setRequestPublic(supabase: ServerSupabase, id: string, isPublic: boolean) {
  return asRpcResult('set_request_public', await supabase.rpc('set_request_public', { p_id: id, p_public: isPublic }));
}
