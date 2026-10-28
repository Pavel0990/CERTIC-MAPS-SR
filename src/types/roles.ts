/** Roles guardados en user_roles (ARCHITECTURE.md §10.2). `visitor` no es un rol: es no tener sesión. */
export type RoleName = 'citizen' | 'entrepreneur' | 'moderator' | 'municipal_admin';

/** Roles del personal municipal: los que el panel asigna y revoca (assign_role, revoke_role). */
export type StaffRole = Extract<RoleName, 'moderator' | 'municipal_admin'>;
