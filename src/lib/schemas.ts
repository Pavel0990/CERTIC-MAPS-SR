import { z } from 'zod';

/** Clave de idempotencia generada en el cliente (8–64 caracteres, DATABASE.md §2.1): reenviar no duplica. */
export const idempotencyKey = z.string().regex(/^[A-Za-z0-9_-]{8,64}$/, 'Clave de idempotencia inválida');

/** Clave nueva para un envío desde el cliente: un UUID sin guiones (32 caracteres). */
export const newIdempotencyKey = () => crypto.randomUUID().replace(/-/g, '');
