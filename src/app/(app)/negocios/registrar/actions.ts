'use server';
import { businessInput } from '@/modules/businesses';
import { submitBusiness } from '@/modules/businesses/server';
import { createClient } from '@/lib/supabase/server';
import { fromRpc, invalid, unavailable, type ActionResult } from '../../_contenido/action-result';

/** Alta de un negocio (submit_business). La clave de idempotencia evita duplicados si se reintenta. */
export async function registerBusiness(input: unknown): Promise<ActionResult> {
  const parsed = businessInput.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  try {
    return fromRpc(await submitBusiness(await createClient(), parsed.data));
  } catch {
    return unavailable();
  }
}
