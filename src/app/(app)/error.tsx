'use client';
import Link from 'next/link';
import { useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Algo falló al cargar o al guardar: se dice en palabras simples y se puede reintentar sin perder la app. */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => console.error(error), [error]);
  return (
    <main id="contenido" className="mx-auto flex min-h-[60dvh] max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-[26px] font-extrabold">Algo no salió bien</h1>
      <p className="text-[16px] text-muted">Puede ser la conexión o un problema momentáneo. Lo que ya enviaste está a salvo.</p>
      <div className="flex w-full flex-col gap-2">
        <Button size="lg" icon={<RefreshCw className="size-5" />} onClick={reset}>Intentar otra vez</Button>
        <Link href="/" className="press inline-flex min-h-12 items-center justify-center rounded-[14px] font-semibold text-ink hover:bg-surface">Volver al inicio</Link>
      </div>
      {error.digest && <p className="font-mono text-xs text-subtle">Código: {error.digest}</p>}
    </main>
  );
}
