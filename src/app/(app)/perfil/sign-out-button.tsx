'use client';
import { useTransition } from 'react';
import { LogOut } from 'lucide-react';
import { unsubscribeDevice } from '@/modules/notifications';
import { Button } from '@/components/ui/button';
import { outbox } from '@/lib/outbox';
import { clearOfflineCaches } from '@/lib/pwa';
import { signOut } from '../entrar/actions';
import { disablePush } from './actions';

/**
 * Salir dejando el dispositivo limpio para la próxima persona (teléfonos compartidos):
 * sin notificaciones de esta cuenta, sin páginas guardadas y sin reportes pendientes a su nombre.
 */
export function SignOutButton() {
  const [pending, start] = useTransition();
  const run = () =>
    start(async () => {
      const queued = await outbox.all().catch(() => []);
      if (queued.length > 0) {
        const msg = queued.length === 1
          ? 'Tienes 1 reporte sin enviar en este dispositivo. Si sales, se borrará. ¿Quieres salir igual?'
          : `Tienes ${queued.length} reportes sin enviar en este dispositivo. Si sales, se borrarán. ¿Quieres salir igual?`;
        if (!window.confirm(msg)) return;
        for (const item of queued) await outbox.remove(item.id).catch(() => {});
      }
      const endpoint = await unsubscribeDevice().catch(() => null);
      if (endpoint) await disablePush(endpoint).catch(() => {});
      await clearOfflineCaches().catch(() => {});
      await signOut();
    });
  return (
    <Button variant="secondary" block loading={pending} icon={<LogOut className="size-4" />} onClick={run}>
      Salir de mi cuenta
    </Button>
  );
}
