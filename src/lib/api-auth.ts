import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { errorResponse } from '@/lib/http';
import { isSameOrigin } from '@/lib/same-origin';

/**
 * Sesión para un Route Handler que cambia datos: comprueba el origen (CSRF) y devuelve el cliente con el JWT
 * del usuario y su id verificado (getClaims). Si algo falla, devuelve la respuesta 403 o 401 lista para retornar.
 */
export async function requireApiUser(request: Request) {
  if (!isSameOrigin(request)) return { error: errorResponse(403, 'forbidden_origin', 'Petición no permitida.') } as const;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return { error: errorResponse(401, 'not_authenticated', 'Tienes que entrar a tu cuenta.') } as const;
  return { supabase, userId } as const;
}

/** Lee y valida el cuerpo JSON; devuelve null si no es JSON. */
export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
