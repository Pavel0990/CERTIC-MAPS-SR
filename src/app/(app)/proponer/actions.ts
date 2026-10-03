'use server';
import { placeProposalInput } from '@/modules/tourism';
import { proposePlace } from '@/modules/tourism/server';
import { routeProposalInput } from '@/modules/routes';
import { proposeRoute } from '@/modules/routes/server';
import { createClient } from '@/lib/supabase/server';
import { fromRpc, invalid, unavailable, type ActionResult } from '../_contenido/action-result';

/** Propuesta de lugar (propose_place). El personal del municipio la publica directo. */
export async function submitPlace(input: unknown): Promise<ActionResult> {
  const parsed = placeProposalInput.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  try {
    return fromRpc(await proposePlace(await createClient(), parsed.data));
  } catch {
    return unavailable();
  }
}

/** Propuesta de ruta (propose_route). La base valida el trazado y calcula la distancia. */
export async function submitRoute(input: unknown): Promise<ActionResult> {
  const parsed = routeProposalInput.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  try {
    return fromRpc(await proposeRoute(await createClient(), parsed.data));
  } catch {
    return unavailable();
  }
}
