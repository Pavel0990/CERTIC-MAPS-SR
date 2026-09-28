import { z } from 'zod';

/** Clave de idempotencia generada en el cliente (8–64 caracteres, DATABASE.md §2.1). */
export const idempotencyKey = z.string().regex(/^[A-Za-z0-9_-]{8,64}$/, 'Clave de idempotencia inválida');

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
