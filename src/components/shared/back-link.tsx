'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { ChevronLeft } from 'lucide-react';

// ¿Se navegó dentro de la app desde la última carga completa? Vive en la memoria de la página: una recarga
// o un enlace de fuera lo reinicia. (`document.referrer` no sirve: en una SPA no cambia al navegar dentro.)
let lastPath: string | null = null;
let movedInsideApp = false;

/** Anota los cambios de pantalla dentro de la app. Va una sola vez, en el layout. */
export function NavigationTracker() {
  const pathname = usePathname();
  useEffect(() => {
    if (lastPath !== null && lastPath !== pathname) movedInsideApp = true;
    lastPath = pathname;
  }, [pathname]);
  return null;
}

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
        if (movedInsideApp && window.history.length > 1) {
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
