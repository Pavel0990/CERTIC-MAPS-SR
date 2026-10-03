import { z } from 'zod';

/** Tipos de lugar: coinciden con el CHECK de tourism_places.kind (supabase/migrations). */
export const PLACE_KINDS = ['mirador', 'rio_balneario', 'cultural', 'historico', 'agroturismo', 'naturaleza', 'otro'] as const;

const optionalText = (max: number, message: string) =>
  z.string().trim().max(max, message).optional().transform((v) => v || undefined);

/** Propuesta ciudadana de un lugar (propose_place). El personal publica directo; el resto queda pendiente. */
export const placeProposalInput = z.object({
  name: z.string().trim().min(2, 'Escribe el nombre del lugar (al menos 2 letras).').max(120),
  kind: z.enum(PLACE_KINDS, 'Elige qué tipo de lugar es.'),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  description: optionalText(3000, 'La descripción es muy larga (máximo 3000 letras).'),
});
export type PlaceProposalInput = z.infer<typeof placeProposalInput>;

/** Edición de un lugar (update_place): lista blanca de campos y versión para el bloqueo optimista. */
export const placeUpdateInput = z.object({
  id: z.uuid(),
  version: z.number().int().positive(),
  name: z.string().trim().min(2, 'Escribe el nombre del lugar (al menos 2 letras).').max(120),
  kind: z.enum(PLACE_KINDS, 'Elige qué tipo de lugar es.'),
  description: z.string().trim().max(3000, 'La descripción es muy larga (máximo 3000 letras).'),
  accessibility: z.string().trim().max(500, 'El acceso es muy largo (máximo 500 letras).'),
  opening_info: z.string().trim().max(300, 'El horario es muy largo (máximo 300 letras).'),
  services: z.record(z.string().regex(/^[a-z_]{2,30}$/), z.boolean()),
});
export type PlaceUpdateInput = z.infer<typeof placeUpdateInput>;
