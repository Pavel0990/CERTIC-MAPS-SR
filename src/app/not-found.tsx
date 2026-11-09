import type { Metadata } from 'next';
import { NotFoundContent } from '@/components/shared/not-found-content';

export const metadata: Metadata = { title: 'Página no encontrada' };

// Direcciones que no existen: aquí no hay layout de la app, así que la página pone su propio <main>
export default function NotFound() {
  return (
    <main id="contenido" className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <NotFoundContent />
    </main>
  );
}
