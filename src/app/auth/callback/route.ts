import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { safeNext } from '@/lib/safe-redirect';

// Retorno del enlace del correo (PKCE): cambia el código por la sesión y vuelve a una ruta interna.
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const next = safeNext(request.nextUrl.searchParams.get('next'));
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, request.nextUrl.origin));
  }
  const url = new URL('/entrar', request.nextUrl.origin);
  url.searchParams.set('error', 'enlace');
  url.searchParams.set('next', next);
  return NextResponse.redirect(url);
}
