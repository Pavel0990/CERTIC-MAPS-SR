import 'server-only';
import type { ServerSupabase } from '@/lib/supabase/server';
import type { RpcResult } from '@/lib/http';
import type { BusinessInput, BusinessUpdateInput, HoursInput, PromotionInput } from '../schemas';

export async function submitBusiness(supabase: ServerSupabase, input: BusinessInput) {
  const { data, error } = await supabase.rpc('submit_business', {
    p_name: input.name,
    p_category_slug: input.categorySlug,
    p_lat: input.lat,
    p_lng: input.lng,
    p_idempotency_key: input.idempotencyKey,
    p_description: input.description,
    p_phone: input.phone,
    p_whatsapp: input.whatsapp,
    p_email: input.email,
    p_website: input.website,
    p_address: input.address,
  });
  if (error) throw new Error(`submit_business: ${error.message}`);
  return data as unknown as RpcResult;
}

/** Envía todos los campos editables: los vacíos se guardan como "sin valor" (la RPC hace nullif). */
export async function updateBusiness(supabase: ServerSupabase, input: BusinessUpdateInput) {
  const { id, version, ...fields } = input;
  const changes = Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, v ?? '']));
  const { data, error } = await supabase.rpc('update_business', { p_id: id, p_version: version, p_changes: changes });
  if (error) throw new Error(`update_business: ${error.message}`);
  return data as unknown as RpcResult;
}

export async function setBusinessHours(supabase: ServerSupabase, input: HoursInput) {
  const { data, error } = await supabase.rpc('set_business_hours', { p_business_id: input.businessId, p_hours: input.hours });
  if (error) throw new Error(`set_business_hours: ${error.message}`);
  return data as unknown as RpcResult;
}

export async function createPromotion(supabase: ServerSupabase, input: PromotionInput) {
  const { data, error } = await supabase.rpc('create_promotion', {
    p_business_id: input.businessId,
    p_title: input.title,
    p_valid_from: input.validFrom,
    p_valid_until: input.validUntil,
    p_description: input.description,
  });
  if (error) throw new Error(`create_promotion: ${error.message}`);
  return data as unknown as RpcResult;
}
