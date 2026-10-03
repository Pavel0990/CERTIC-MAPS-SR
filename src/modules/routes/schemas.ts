import { z } from 'zod';

/** Coinciden con los CHECK de eco_routes (supabase/migrations). */
export const ROUTE_KINDS = ['ecologica', 'cultural', 'aventura'] as const;
export const DIFFICULTIES = ['baja', 'media', 'alta'] as const;

/** La base acepta de 2 a 5000 puntos por trazado. */
export const MAX_ROUTE_POINTS = 5000;

const position = z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]);

export const lineGeometry = z.object({
  type: z.literal('LineString'),
  coordinates: z.array(position).min(2, 'Marca al menos 2 puntos del recorrido.').max(MAX_ROUTE_POINTS, 'El trazado tiene demasiados puntos.'),
});
export type LineGeometry = z.infer<typeof lineGeometry>;

const duration = z.number().int('Escribe la duración en minutos.').min(5, 'La duración mínima es 5 minutos.').max(2880, 'La duración máxima es 2 días.');

/** Propuesta ciudadana de una ruta (propose_route). El municipio se toma del punto de inicio. */
export const routeProposalInput = z.object({
  name: z.string().trim().min(2, 'Escribe el nombre de la ruta (al menos 2 letras).').max(120),
  kind: z.enum(ROUTE_KINDS, 'Elige qué tipo de ruta es.'),
  difficulty: z.enum(DIFFICULTIES, 'Elige la dificultad.'),
  durationMin: duration,
  description: z.string().trim().max(3000, 'La descripción es muy larga (máximo 3000 letras).').optional().transform((v) => v || undefined),
  geojson: lineGeometry,
});
export type RouteProposalInput = z.infer<typeof routeProposalInput>;

/** Edición de una ruta (update_route). El trazado nuevo solo lo puede enviar el personal. */
export const routeUpdateInput = z.object({
  id: z.uuid(),
  version: z.number().int().positive(),
  name: z.string().trim().min(2, 'Escribe el nombre de la ruta (al menos 2 letras).').max(120),
  kind: z.enum(ROUTE_KINDS, 'Elige qué tipo de ruta es.'),
  difficulty: z.enum(DIFFICULTIES, 'Elige la dificultad.'),
  duration_min: duration,
  description: z.string().trim().max(3000, 'La descripción es muy larga (máximo 3000 letras).'),
  services: z.record(z.string().regex(/^[a-z_]{2,30}$/), z.boolean()),
});
export type RouteUpdateInput = z.infer<typeof routeUpdateInput>;
