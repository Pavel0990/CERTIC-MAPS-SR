import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { errorResponse } from '@/lib/http';

/**
 * Sesión para un Route Handler: cliente con el JWT del usuario y su id verificado (getClaims).
 * Si no hay sesión, devuelve la respuesta 401 lista para retornar.
 */
export async function requireApiUser() {
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
