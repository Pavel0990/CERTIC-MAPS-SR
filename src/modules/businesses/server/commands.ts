import 'server-only';
import type { ServerSupabase } from '@/lib/supabase/server';
import { asRpcResult } from '@/lib/rpc';
import type { BusinessInput, BusinessUpdateInput, HoursInput, PromotionInput } from '../schemas';

export async function submitBusiness(supabase: ServerSupabase, input: BusinessInput) {
  return asRpcResult('submit_business', await supabase.rpc('submit_business', {
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
  }));
}

/** Envía todos los campos editables: los vacíos se guardan como "sin valor" (la RPC hace nullif). */
export async function updateBusiness(supabase: ServerSupabase, input: BusinessUpdateInput) {
  const { id, version, ...fields } = input;
  const changes = Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, v ?? '']));
  return asRpcResult('update_business', await supabase.rpc('update_business', { p_id: id, p_version: version, p_changes: changes }));
}

export async function setBusinessHours(supabase: ServerSupabase, input: HoursInput) {
  return asRpcResult('set_business_hours', await supabase.rpc('set_business_hours', { p_business_id: input.businessId, p_hours: input.hours }));
}

export async function createPromotion(supabase: ServerSupabase, input: PromotionInput) {
  return asRpcResult('create_promotion', await supabase.rpc('create_promotion', {
    p_business_id: input.businessId,
    p_title: input.title,
    p_valid_from: input.validFrom,
    p_valid_until: input.validUntil,
    p_description: input.description,
  }));
}
