'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';

/**
 * Enlace "Volver": si la persona llegó desde otra pantalla de la app, vuelve exactamente ahí
 * (lista filtrada, mapa en el mismo encuadre…). Si entró directo (enlace compartido, notificación),
 * va a `href`. Sin JavaScript funciona como un enlace normal.
 */
export function BackLink({ href, label }: { href: string; label: string }) {
  const router = useRouter();
  return (
    <Link prefetch={false}
      href={href}
      onClick={(e) => {
        const fromApp = typeof document !== 'undefined' && document.referrer.startsWith(window.location.origin);
        if (fromApp && window.history.length > 1) {
          e.preventDefault();
          router.back();
        }
      }}
      className="-ml-2 mb-3 inline-flex h-11 items-center gap-1 rounded-full px-2 text-[15px] font-semibold text-muted hover:bg-surface hover:text-ink"
    >
      <ChevronLeft className="size-5" aria-hidden /> {label}
    </Link>
  );
}
