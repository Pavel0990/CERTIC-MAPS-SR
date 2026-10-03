'use client';
import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { registerServiceWorker } from '@/lib/pwa';

/**
 * Registra el service worker y avisa cuando hay una versión nueva (§6.4).
 * Nunca se actualiza solo: la persona decide cuándo, así no se pierde un formulario a medias.
 */
export function ServiceWorker() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    let reloading = false;
    const onControllerChange = () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    registerServiceWorker()
      .then((reg) => {
        // Solo es "actualización" si ya había una versión controlando la página
        const offer = (w: ServiceWorker | null) => w && navigator.serviceWorker.controller && setWaiting(w);
        offer(reg.waiting);
        reg.addEventListener('updatefound', () => {
          const next = reg.installing;
          next?.addEventListener('statechange', () => next.state === 'installed' && offer(next));
        });
      })
      .catch(() => {}); // sin service worker la app funciona igual, solo sin modo sin conexión
    return () => navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
  }, []);

  if (!waiting) return null;
  return (
    <div role="status" className="fixed inset-x-3 bottom-[calc(80px+env(safe-area-inset-bottom))] z-[60] mx-auto flex max-w-md items-center gap-3 rounded-[16px] bg-ink p-3 pl-4 text-white shadow-lg md:bottom-6">
      <Sparkles className="size-5 shrink-0 text-warn-bright" aria-hidden />
      <span className="flex-1 text-[15px]">Hay una versión nueva de SR Conecta.</span>
      <Button size="sm" variant="soft" onClick={() => waiting.postMessage({ type: 'SKIP_WAITING' })}>
        Actualizar
      </Button>
    </div>
  );
}
