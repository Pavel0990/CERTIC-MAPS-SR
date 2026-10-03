'use server';
import { revalidatePath } from 'next/cache';
import { placeUpdateInput } from '@/modules/tourism';
import { updatePlace } from '@/modules/tourism/server';
import { createClient } from '@/lib/supabase/server';
import { fromRpc, invalid, unavailable, type ActionResult } from '../../../_contenido/action-result';

/** Guarda los cambios de un lugar (update_place). La base comprueba el permiso y la versión. */
export async function savePlace(input: unknown): Promise<ActionResult> {
  const parsed = placeUpdateInput.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  try {
    const r = fromRpc(await updatePlace(await createClient(), parsed.data), parsed.data.id);
    if (r.status === 'ok') revalidatePath(`/turismo/${parsed.data.id}`);
    return r;
  } catch {
    return unavailable();
  }
}
