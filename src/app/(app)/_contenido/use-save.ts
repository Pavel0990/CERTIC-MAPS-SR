'use client';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { useToast } from '@/components/ui/toast';

type SaveResult = { status: string; message?: string; reason?: string; extra?: Record<string, unknown> };

/**
 * Guardar con una Server Action del frente de contenido (ActionResult).
 * Si se rechaza, deja el mensaje en `error`; si otra persona cambió la ficha (version_conflict), recarga los datos.
 * Si sale bien, avisa con `ok` y luego navega a `then` (una ruta) o ejecuta `then()` y recarga la página.
 */
export function useSave() {
  const router = useRouter();
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function run(fn: () => Promise<SaveResult>, ok: string | ((r: SaveResult) => string), then?: string | (() => void)) {
    setError(null);
    start(async () => {
      let r: SaveResult;
      try {
        r = await fn();
      } catch {
        setError('No pudimos guardar. Revisa tu conexión e inténtalo otra vez.');
        return;
      }
      if (r.status === 'rejected') {
        setError(r.message ?? 'No se pudo guardar.');
        if (r.reason === 'version_conflict') router.refresh();
        return;
      }
      toast.show(typeof ok === 'function' ? ok(r) : ok);
      if (typeof then === 'string') {
        router.push(then);
      } else {
        then?.();
        router.refresh();
      }
    });
  }

  return { error, pending, run };
}

/** Solo se guardan los servicios marcados: lo no marcado queda "sin dato" en vez de "no hay". */
export function markedServices(services: Record<string, boolean>) {
  return Object.fromEntries(Object.entries(services).filter(([, on]) => on));
}
