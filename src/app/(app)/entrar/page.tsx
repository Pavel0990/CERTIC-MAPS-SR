import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getViewer } from '@/lib/auth';
import { safeNext } from '@/lib/safe-redirect';
import { Wordmark } from '@/components/shared/logo';
import { SignInForm } from './sign-in-form';

export const metadata: Metadata = { title: 'Entrar' };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  const target = safeNext(next);
  if (await getViewer()) redirect(target);
  return (
    <div className="mx-auto flex min-h-[calc(100dvh-68px)] max-w-md flex-col justify-center px-5 py-10 md:min-h-dvh">
      <Wordmark />
      <h1 className="mt-8 text-3xl font-extrabold">Entra a tu cuenta</h1>
      <p className="mt-2 text-[17px] text-muted">
        Para reportar problemas, votar y recibir avisos. Sin contraseña: te enviamos un correo para entrar.
      </p>
      <SignInForm next={target} linkError={error === 'enlace'} />
      <p className="mt-8 text-sm text-muted">
        Al entrar aceptas los términos de uso y la política de privacidad. Solo usamos tu ubicación cuando tú lo pides, para ubicar un reporte.
      </p>
    </div>
  );
}
