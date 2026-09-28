'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { TOPICS } from '@/modules/notifications/server';

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
    .upsert({ user_id: uid, topics, municipalities, email_enabled: form.get('email_enabled') === 'on' }, { onConflict: 'user_id' });
  if (error) return { error: 'No pudimos guardar tus avisos. Inténtalo otra vez.' };
  revalidatePath('/perfil');
  return { ok: true };
}
