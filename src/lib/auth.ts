import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { RoleName, StaffRole } from '@/types/roles';

export type { RoleName, StaffRole };

export const STAFF_ROLES: readonly StaffRole[] = ['moderator', 'municipal_admin'];
export interface RoleScope { role: RoleName; municipality_id: string | null }

export interface Viewer {
  id: string;
  email: string | null;
  displayName: string;
  homeMunicipalityId: string | null;
  avatarVersion: number | null;
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
    supabase.from('profiles').select('display_name, home_municipality_id, avatar_version').eq('id', claims.sub).maybeSingle(),
    supabase.from('user_roles').select('role, municipality_id').eq('user_id', claims.sub),
  ]);
  const scopes = (roles ?? []) as RoleScope[];
  const has = (r: RoleName) => scopes.some((s) => s.role === r);
  return {
    id: claims.sub,
    email: (claims.email as string | undefined) ?? null,
    displayName: profile?.display_name || (claims.email as string | undefined)?.split('@')[0] || 'Vecino',
    homeMunicipalityId: profile?.home_municipality_id ?? null,
    avatarVersion: profile?.avatar_version ?? null,
    roles: scopes,
    isStaff: STAFF_ROLES.some(has),
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

/**
 * ¿Es personal (moderación o administración) de ese municipio? Un rol provincial (municipio NULL) vale para todos.
 * Solo decide la interfaz: la RLS y las RPC lo vuelven a comprobar (ADR-018).
 */
export function isStaffOf(viewer: Viewer | null, municipalityId: string) {
  return !!viewer?.roles.some((r) => isStaffRole(r.role) && (r.municipality_id === null || r.municipality_id === municipalityId));
}

export function isStaffRole(role: string): role is StaffRole {
  return (STAFF_ROLES as readonly string[]).includes(role);
}
