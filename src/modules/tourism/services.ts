// Servicios de un lugar turístico o de una ruta. Las claves vienen del JSON `tourism_places.services` (ver supabase/ops/seed_demo_content.sql).
export const PLACE_SERVICES: Record<string, string> = {
  parqueo: 'Parqueo',
  comida: 'Comida',
  banos: 'Baños',
  guia: 'Guía',
  agua: 'Agua para beber',
};

/** Convierte el JSON de servicios en una lista legible. Las claves desconocidas se muestran tal cual. */
export function listServices(services: Record<string, unknown> | null | undefined) {
  return Object.entries(services ?? {})
    .filter(([, v]) => typeof v === 'boolean')
    .map(([key, v]) => ({ key, label: PLACE_SERVICES[key] ?? key.replace(/_/g, ' '), available: v as boolean }));
}
