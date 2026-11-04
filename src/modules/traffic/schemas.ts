import { z } from 'zod';
import { idempotencyKey } from '@/lib/schemas';

const lat = z.number().min(-90).max(90);
const lng = z.number().min(-180).max(180);

/** Reporte de tránsito (F4). Validación de forma: la RPC valida todo de nuevo (ADR-018). */
export const trafficReportInput = z.object({
  type: z.string().min(2).max(40),
  lat,
  lng,
  severity: z.number().int().min(1).max(3).optional(),
  description: z.string().trim().max(500).optional(),
  idempotencyKey,
});
export type TrafficReportInput = z.infer<typeof trafficReportInput>;
