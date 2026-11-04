'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';

/**
 * La bandeja se actualiza sola cada 30 s (ADR-012: el panel usa sondeo, no Realtime).
 * Se pausa con la pestaña oculta para no consumir datos.
 */
export function AutoRefresh({ seconds = 30 }: { seconds?: number }) {
  const router = useRouter();
  const [at, setAt] = useState(() => new Date());
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState !== 'visible') return;
      router.refresh();
      setAt(new Date());
    };
    const t = setInterval(tick, seconds * 1000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [router, seconds]);
  return (
    <p className="flex items-center gap-1.5 text-sm text-muted" aria-live="polite">
      <RefreshCw className="size-3.5" aria-hidden />
      Se actualiza sola · {at.toLocaleTimeString('es-DO', { hour: 'numeric', minute: '2-digit' })}
    </p>
  );
}
