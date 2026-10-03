'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { uploadPhotos } from '@/modules/media';
import { useToast } from '@/components/ui/toast';
import { flushOutbox } from '@/lib/outbox';

let flushing = false; // una sola ejecución a la vez (StrictMode monta dos veces; 'online' puede repetirse)

/**
 * Envía la cola de reportes hechos sin conexión (§6.4) al abrir la app y al volver la red.
 * Cada item lleva su idempotency_key: aunque se envíe dos veces, el servidor crea un solo reporte.
 */
export function OutboxSync() {
  const toast = useToast();
  const router = useRouter();

  useEffect(() => {
    const sync = async () => {
      if (flushing || !navigator.onLine) return;
      flushing = true;
      try {
        const { sent } = await flushOutbox((entity, id, blobs) => uploadPhotos(entity, id, blobs));
        if (sent > 0) {
          toast.show(sent === 1 ? 'Enviamos el reporte que tenías pendiente.' : `Enviamos ${sent} reportes que tenías pendientes.`);
          router.refresh();
        }
      } catch {
        // IndexedDB no disponible (modo privado): no hay cola que enviar
      } finally {
        flushing = false;
      }
    };
    void sync();
    window.addEventListener('online', sync);
    return () => window.removeEventListener('online', sync);
  }, [toast, router]);

  return null;
}
