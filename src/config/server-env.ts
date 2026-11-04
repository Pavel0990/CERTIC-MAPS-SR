import 'server-only';
import { z } from 'zod';

// Secretos del servidor. Nunca se importan desde el cliente (server-only rompe el build si ocurre).
const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  CRON_SECRET: z.string().min(32),
  JOBS_SECRET: z.string().min(32),
  DEFAULT_PROVINCE_CODE: z.string().default('SR'),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT: z.string().optional(),
});

let cached: z.infer<typeof serverSchema> | null = null;

/** Lee y valida los secretos al primer uso (así el build no exige secretos que solo usa el worker). */
export function serverEnv() {
  cached ??= serverSchema.parse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    CRON_SECRET: process.env.CRON_SECRET,
    JOBS_SECRET: process.env.JOBS_SECRET,
    DEFAULT_PROVINCE_CODE: process.env.DEFAULT_PROVINCE_CODE,
    VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY || undefined,
    VAPID_SUBJECT: process.env.VAPID_SUBJECT || undefined,
  });
  return cached;
}
