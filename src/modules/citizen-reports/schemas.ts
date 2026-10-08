import { z } from 'zod';
import { idempotencyKey } from '@/lib/schemas';

/** Incidencia o consulta municipal (F5). La RPC exige punto para `incident` (§9.2). */
export const citizenRequestInput = z
  .object({
    kind: z.enum(['incident', 'inquiry']),
    category: z.string().min(2).max(40),
    title: z.string().trim().min(3, 'Escribe un título corto.').max(120),
    description: z.string().trim().min(10, 'Cuéntanos un poco más (al menos 10 letras).').max(2000),
    lat: z.number().min(-90).max(90).optional(),
    lng: z.number().min(-180).max(180).optional(),
    municipalityId: z.uuid().optional(),
    idempotencyKey,
  })
  .refine((v) => v.kind === 'inquiry' || (v.lat !== undefined && v.lng !== undefined), {
    message: 'Marca en el mapa dónde está el problema.',
    path: ['lat'],
  });
export type CitizenRequestInput = z.infer<typeof citizenRequestInput>;
