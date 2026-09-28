'use server';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { safeNext } from '@/lib/safe-redirect';
import { publicEnv } from '@/config/env';

export type AuthState = { step: 'email' | 'code'; email?: string; error?: string };

const emailSchema = z.email('Escribe un correo válido, por ejemplo nombre@gmail.com.');

/** Paso 1: enviar el correo de acceso. La respuesta es la misma exista o no la cuenta (anti-enumeración, §10.1). */
export async function requestAccess(_prev: AuthState, form: FormData): Promise<AuthState> {
  const parsed = emailSchema.safeParse(String(form.get('email') ?? '').trim().toLowerCase());
  if (!parsed.success) return { step: 'email', error: parsed.error.issues[0]?.message };
  const next = safeNext(String(form.get('next') ?? '/'));
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data,
    options: { shouldCreateUser: true, emailRedirectTo: `${publicEnv.NEXT_PUBLIC_APP_URL}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error?.status === 429) return { step: 'email', email: parsed.data, error: 'Pediste varios correos seguidos. Espera unos minutos y vuelve a intentarlo.' };
  if (error) return { step: 'email', email: parsed.data, error: 'No pudimos enviar el correo. Inténtalo otra vez en un momento.' };
  return { step: 'code', email: parsed.data };
}

/** Paso 2: entrar con el código del correo. */
export async function verifyCode(_prev: AuthState, form: FormData): Promise<AuthState> {
  const email = String(form.get('email') ?? '');
  const token = String(form.get('token') ?? '').replace(/\D/g, '');
  const next = safeNext(String(form.get('next') ?? '/'));
  if (token.length < 6) return { step: 'code', email, error: 'Escribe el código completo que te llegó por correo.' };
  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
  if (error) return { step: 'code', email, error: 'El código no es correcto o ya venció. Revisa el correo o pide uno nuevo.' };
  redirect(next);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/');
}
