'use client';
import { useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/primitives';

/** Error del panel: lo dice sin detalles internos y deja reintentar sin recargar toda la app. */
export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => console.error(error), [error]);
  return (
    <Card className="flex flex-col items-start gap-3 border border-line p-6">
      <h1 className="text-xl font-bold">No pudimos cargar esta parte del panel</h1>
      <p className="text-[15px] text-muted">Puede ser la conexión o un problema momentáneo. Tus datos están a salvo.</p>
      <Button icon={<RefreshCw className="size-4" />} onClick={reset}>Reintentar</Button>
      {error.digest && <p className="font-mono text-xs text-subtle">Código: {error.digest}</p>}
    </Card>
  );
}
