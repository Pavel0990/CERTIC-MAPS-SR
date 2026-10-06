'use server';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { registerPushDevice, TOPICS, unregisterPushDevice } from '@/modules/notifications/server';

export type FormState = { ok?: boolean; error?: string };

const profileSchema = z.object({
  display_name: z.string().trim().min(2, 'Escribe tu nombre (al menos 2 letras).').max(80),
  home_municipality_id: z.union([z.uuid(), z.literal('')]).transform((v) => v || null),
});

/** Nombre y municipio de residencia. El usuario solo puede cambiar 4 columnas de su perfil (grant por columna). */
export async function saveProfile(_prev: FormState, form: FormData): Promise<FormState> {
  const parsed = profileSchema.safeParse({ display_name: form.get('display_name'), home_municipality_id: form.get('home_municipality_id') ?? '' });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims.sub) return { error: 'Tu sesión venció. Entra de nuevo.' };
  const { error } = await supabase.from('profiles').update(parsed.data).eq('id', claims.claims.sub);
  if (error) return { error: 'No pudimos guardar. Inténtalo otra vez.' };
  revalidatePath('/perfil');
  return { ok: true };
}

const TOPIC_IDS = TOPICS.map((t) => t.id) as string[];

/** Qué avisos recibir y de qué municipios (§9.5). */
export async function savePreferences(_prev: FormState, form: FormData): Promise<FormState> {
  const topics = form.getAll('topics').map(String).filter((t) => TOPIC_IDS.includes(t));
  const municipalities = form.getAll('municipalities').map(String).filter((m) => z.uuid().safeParse(m).success);
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const uid = claims?.claims.sub;
  if (!uid) return { error: 'Tu sesión venció. Entra de nuevo.' };
  const { error } = await supabase
    .from('notification_preferences')
    .upsert({ user_id: uid, topics, municipalities }, { onConflict: 'user_id' }); // el canal email llega en Fase 2 (ADR-013)
  if (error) return { error: 'No pudimos guardar tus avisos. Inténtalo otra vez.' };
  revalidatePath('/perfil');
  return { ok: true };
}

const deviceSchema = z.object({
  endpoint: z.url().startsWith('https://').max(1000),
  p256dh: z.string().min(1).max(200),
  auth: z.string().min(1).max(100),
});
export type PushActionResult = { status: 'ok' | 'rejected'; reason?: string };

/** Notificaciones en este dispositivo (§9.5). La suscripción la crea el navegador; aquí solo se guarda. */
export async function enablePush(sub: unknown): Promise<PushActionResult> {
  const parsed = deviceSchema.safeParse(sub);
  if (!parsed.success) return { status: 'rejected', reason: 'invalid_subscription' };
  try {
    const ua = (await headers()).get('user-agent');
    const r = await registerPushDevice(await createClient(), parsed.data, ua);
    revalidatePath('/perfil');
    return r.status === 'rejected' ? { status: 'rejected', reason: r.reason } : { status: 'ok' };
  } catch {
    return { status: 'rejected', reason: 'unavailable' };
  }
}

export async function disablePush(endpoint: string): Promise<PushActionResult> {
  if (!z.url().safeParse(endpoint).success) return { status: 'rejected', reason: 'invalid_subscription' };
  try {
    const r = await unregisterPushDevice(await createClient(), endpoint);
    revalidatePath('/perfil');
    return r.status === 'rejected' ? { status: 'rejected', reason: r.reason } : { status: 'ok' };
  } catch {
    return { status: 'rejected', reason: 'unavailable' };
  }
}
