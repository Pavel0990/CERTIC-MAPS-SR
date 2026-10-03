'use server';
import { revalidatePath } from 'next/cache';
import { routeUpdateInput } from '@/modules/routes';
import { updateRoute } from '@/modules/routes/server';
import { createClient } from '@/lib/supabase/server';
import { fromRpc, invalid, unavailable, type ActionResult } from '../../../_contenido/action-result';

/** Guarda los cambios de una ruta (update_route). La base comprueba el permiso y la versión. */
export async function saveRoute(input: unknown): Promise<ActionResult> {
  const parsed = routeUpdateInput.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  try {
    const r = fromRpc(await updateRoute(await createClient(), parsed.data), parsed.data.id);
    if (r.status === 'ok') revalidatePath(`/rutas/${parsed.data.id}`);
    return r;
  } catch {
    return unavailable();
  }
}
