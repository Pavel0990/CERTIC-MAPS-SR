import 'server-only';
import { isStaffOf, type Viewer } from '@/lib/auth';

/**
 * ¿Mostrar "Editar" en un lugar o una ruta? Solo decide la interfaz: update_place y update_route
 * vuelven a comprobarlo en la base (ADR-018).
 *  - Personal del municipio (o administración provincial): siempre.
 *  - Quien lo propuso: mientras siga pendiente. Si alguien que no es personal ve algo pendiente,
 *    es porque lo propuso (la RLS solo se lo muestra a esa persona).
 */
export function canEditContent(viewer: Viewer | null, municipalityId: string, status: string) {
  if (!viewer) return false;
  return isStaffOf(viewer, municipalityId) || status === 'pending';
}
