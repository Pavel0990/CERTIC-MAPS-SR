import Link from 'next/link';
import { MapPinOff } from 'lucide-react';

/** Enlace roto o algo que ya no existe: se explica y se ofrece el camino de vuelta. */
export function NotFoundContent() {
  return (
    <>
      <span className="grid size-16 place-items-center rounded-full bg-brand-soft text-brand-strong" aria-hidden><MapPinOff className="size-8" /></span>
      <h1 className="text-[26px] font-extrabold">No encontramos esta página</h1>
      <p className="text-[16px] text-muted">Puede que el enlace esté mal escrito o que ya no exista.</p>
      <div className="flex w-full flex-col gap-2">
        <Link prefetch={false} href="/" className="press inline-flex min-h-[52px] items-center justify-center rounded-[14px] bg-brand px-5 font-semibold text-on-brand hover:bg-brand-strong">Volver al inicio</Link>
        <Link prefetch={false} href="/negocios" className="press inline-flex min-h-12 items-center justify-center rounded-[14px] font-semibold text-ink hover:bg-surface">Ver negocios</Link>
      </div>
    </>
  );
}
