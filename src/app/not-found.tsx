import type { Metadata } from 'next';
import Link from 'next/link';
import { MapPinOff } from 'lucide-react';

export const metadata: Metadata = { title: 'No encontrado' };

/** Enlace roto o algo que ya no existe: se explica y se ofrece el camino de vuelta. */
export default function NotFound() {
  return (
    <main id="contenido" className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="grid size-16 place-items-center rounded-full bg-brand-soft text-brand-strong" aria-hidden><MapPinOff className="size-8" /></span>
      <h1 className="text-[26px] font-extrabold">No encontramos esta página</h1>
      <p className="text-[16px] text-muted">Puede que el enlace esté mal escrito o que ya no exista.</p>
      <div className="flex w-full flex-col gap-2">
        <Link prefetch={false} href="/" className="press inline-flex min-h-[52px] items-center justify-center rounded-[14px] bg-brand px-5 font-semibold text-on-brand hover:bg-brand-strong">Ir al mapa</Link>
        <Link prefetch={false} href="/negocios" className="press inline-flex min-h-12 items-center justify-center rounded-[14px] font-semibold text-ink hover:bg-surface">Ver negocios y lugares</Link>
      </div>
    </main>
  );
}
