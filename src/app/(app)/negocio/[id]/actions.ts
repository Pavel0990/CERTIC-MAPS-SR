'use server';
import { revalidatePath } from 'next/cache';
import { businessUpdateInput, hoursInput, promotionInput } from '@/modules/businesses';
import { createPromotion, setBusinessHours, updateBusiness } from '@/modules/businesses/server';
import { createClient } from '@/lib/supabase/server';
import { fromRpc, invalid, unavailable, type ActionResult } from '../../_contenido/action-result';

function refresh(id: string) {
  revalidatePath(`/negocio/${id}`);
  revalidatePath(`/negocios/${id}`);
}

/** Datos del negocio (update_business). La base comprueba que seas miembro y la versión. */
export async function saveBusiness(input: unknown): Promise<ActionResult> {
  const parsed = businessUpdateInput.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  try {
    const r = fromRpc(await updateBusiness(await createClient(), parsed.data), parsed.data.id);
    if (r.status === 'ok') refresh(parsed.data.id);
    return r;
  } catch {
    return unavailable();
  }
}

/** Horario completo (set_business_hours): reemplaza el anterior. */
export async function saveHours(input: unknown): Promise<ActionResult> {
  const parsed = hoursInput.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  try {
    const r = fromRpc(await setBusinessHours(await createClient(), parsed.data), parsed.data.businessId);
    if (r.status === 'ok') refresh(parsed.data.businessId);
    return r;
  } catch {
    return unavailable();
  }
}

/** Nueva promoción (create_promotion). Queda pendiente hasta que la revise un moderador. */
export async function addPromotion(input: unknown): Promise<ActionResult> {
  const parsed = promotionInput.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  try {
    const r = fromRpc(await createPromotion(await createClient(), parsed.data));
    if (r.status === 'ok') refresh(parsed.data.businessId);
    return r;
  } catch {
    return unavailable();
  }
}
