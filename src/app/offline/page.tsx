import type { Metadata } from 'next';
import Link from 'next/link';
import { WifiOff } from 'lucide-react';
import { Logo } from '@/components/shared/logo';
import { RetryButton } from './retry-button';

export const metadata: Metadata = { title: 'Sin conexión', robots: { index: false } };

// La guarda el service worker al instalarse y la muestra cuando no hay red ni copia de la página (§6.4).
// Sin datos de usuario: es la misma para todos.
export default function OfflinePage() {
  return (
    <main id="contenido" className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-5 px-6 text-center">
      <Logo className="size-14" />
      <span className="grid size-14 place-items-center rounded-full bg-warn-soft text-warn" aria-hidden>
        <WifiOff className="size-7" />
      </span>
      <div>
        <h1 className="text-[26px] font-extrabold">Estás sin conexión</h1>
        <p className="mt-2 text-[16px] text-muted">
          Esta pantalla necesita internet. Las que ya visitaste, como el mapa y el formulario para reportar, siguen funcionando.
        </p>
      </div>
      <ul className="w-full rounded-[16px] bg-surface p-4 text-left text-[15px] shadow-[var(--shadow-card)]">
        <li className="flex gap-2"><span aria-hidden>✓</span> Puedes hacer un reporte: se guarda en tu teléfono y se envía solo al volver la señal.</li>
        <li className="mt-2 flex gap-2"><span aria-hidden>✓</span> No se pierde nada de lo que ya enviaste.</li>
      </ul>
      <div className="flex w-full flex-col gap-2 sm:flex-row">
        <RetryButton />
        <Link href="/reportar" className="inline-flex h-11 items-center sm:flex-1 justify-center rounded-[12px] border border-line-strong bg-surface px-4 text-[15px] font-semibold hover:bg-canvas">
          Hacer un reporte
        </Link>
      </div>
    </main>
  );
}
