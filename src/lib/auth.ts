import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export type RoleName = 'citizen' | 'entrepreneur' | 'moderator' | 'municipal_admin';
export interface RoleScope { role: RoleName; municipality_id: string | null }

export interface Viewer {
  id: string;
  email: string | null;
  displayName: string;
  homeMunicipalityId: string | null;
  roles: RoleScope[];
  isStaff: boolean;
  isAdmin: boolean;
  isProvincialAdmin: boolean;
  isEntrepreneur: boolean;
}

/**
 * Usuario actual con sus roles, una vez por request.
 * La identidad se valida con getClaims() (firma del JWT), nunca con getSession() (§10.1).
 * Los roles sirven para mostrar u ocultar interfaz: la autorización real la hacen RLS y las RPC.
 */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;

  const [{ data: profile }, { data: roles }] = await Promise.all([
    supabase.from('profiles').select('display_name, home_municipality_id').eq('id', claims.sub).maybeSingle(),
    supabase.from('user_roles').select('role, municipality_id').eq('user_id', claims.sub),
  ]);
  const scopes = (roles ?? []) as RoleScope[];
  const has = (r: RoleName) => scopes.some((s) => s.role === r);
  return {
    id: claims.sub,
    email: (claims.email as string | undefined) ?? null,
    displayName: profile?.display_name || (claims.email as string | undefined)?.split('@')[0] || 'Vecino',
    homeMunicipalityId: profile?.home_municipality_id ?? null,
    roles: scopes,
    isStaff: has('moderator') || has('municipal_admin'),
    isAdmin: has('municipal_admin'),
    isProvincialAdmin: scopes.some((s) => s.role === 'municipal_admin' && s.municipality_id === null),
    isEntrepreneur: has('entrepreneur'),
  };
});

/** Exige sesión; si no hay, lleva a /entrar y vuelve después. */
export async function requireViewer(next: string) {
  const viewer = await getViewer();
  if (!viewer) redirect(`/entrar?next=${encodeURIComponent(next)}`);
  return viewer;
}

/** Exige rol de personal municipal (moderador o administrador). */
export async function requireStaff(next = '/admin') {
  const viewer = await requireViewer(next);
  if (!viewer.isStaff) redirect('/sin-permiso');
  return viewer;
}

/** Nombre y municipio de residencia del propio perfil (grant por columna: solo esas columnas). */
export async function updateOwnProfile(userId: string, data: { display_name: string; home_municipality_id: string | null }) {
  const supabase = await createClient();
  const { error } = await supabase.from('profiles').update(data).eq('id', userId);
  return !error;
}
