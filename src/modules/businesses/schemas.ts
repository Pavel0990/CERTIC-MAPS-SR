import { z } from 'zod';
import { idempotencyKey } from '@/lib/schemas';

/** Campo opcional: vacío = sin valor. Los formatos coinciden con los CHECK de businesses (supabase/migrations). */
const optional = <T extends z.ZodType<string>>(schema: T) => z.union([z.literal(''), schema]).optional().transform((v) => v || undefined);
const phone = z.string().trim().regex(/^\+?[0-9 ()-]{7,20}$/, 'Escribe un teléfono válido, por ejemplo 809 555 1234.');

const contact = {
  description: optional(z.string().trim().max(2000, 'La descripción es muy larga (máximo 2000 letras).')),
  phone: optional(phone),
  whatsapp: optional(phone),
  email: optional(z.string().trim().max(254).regex(/^[^@\s]+@[^@\s]+\.[^@\s]+$/, 'Escribe un correo válido.')),
  website: optional(z.string().trim().max(300).regex(/^https:\/\//i, 'La página web debe empezar por https://')),
  address: optional(z.string().trim().max(200, 'La dirección es muy larga (máximo 200 letras).')),
};
const name = z.string().trim().min(2, 'Escribe el nombre del negocio (al menos 2 letras).').max(120);

/** Alta de un negocio (submit_business). Queda pendiente hasta que un moderador lo apruebe. */
export const businessInput = z.object({
  name,
  categorySlug: z.string().min(2, 'Elige el tipo de negocio.').max(40),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  idempotencyKey,
  ...contact,
});
export type BusinessInput = z.infer<typeof businessInput>;

/** Edición de los datos (update_business). Un campo vacío borra el valor. */
export const businessUpdateInput = z.object({ id: z.uuid(), version: z.number().int().positive(), name, ...contact });
export type BusinessUpdateInput = z.infer<typeof businessUpdateInput>;

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Hora inválida.');

/** Horario completo (set_business_hours). 0 = domingo. Si cierra antes de abrir, cierra después de medianoche. */
export const hoursInput = z.object({
  businessId: z.uuid(),
  hours: z
    .array(z.object({ weekday: z.number().int().min(0).max(6), opens: time, closes: time }))
    .max(21)
    .refine((h) => h.every((x) => x.opens !== x.closes), 'La hora de abrir y la de cerrar no pueden ser iguales.')
    .refine((h) => new Set(h.map((x) => `${x.weekday}-${x.opens}`)).size === h.length, 'Hay un horario repetido.'),
});
export type HoursInput = z.infer<typeof hoursInput>;

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida.');
const DAY = 86_400_000;

/** Promoción informativa (create_promotion). Dura como mucho 90 días y empieza hoy o después. */
export const promotionInput = z
  .object({
    businessId: z.uuid(),
    title: z.string().trim().min(3, 'Escribe un título (al menos 3 letras).').max(120),
    description: optional(z.string().trim().max(500, 'La descripción es muy larga (máximo 500 letras).')),
    validFrom: date,
    validUntil: date,
  })
  .refine((p) => p.validUntil >= p.validFrom, { message: 'La fecha final debe ser igual o posterior a la inicial.', path: ['validUntil'] })
  .refine((p) => (Date.parse(p.validUntil) - Date.parse(p.validFrom)) / DAY <= 90, { message: 'Una promoción dura como mucho 90 días.', path: ['validUntil'] });
export type PromotionInput = z.infer<typeof promotionInput>;
