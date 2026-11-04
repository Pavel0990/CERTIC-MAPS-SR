'use client';
import { useEffect, useState, useSyncExternalStore, useTransition } from 'react';
import { BellOff, BellRing, Share } from 'lucide-react';
import { currentSubscription, pushSupport, subscribeDevice, unsubscribeDevice } from '@/modules/notifications';
import { Button } from '@/components/ui/button';
import { Notice } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { reasonMessage } from '@/lib/vocabulary';
import { disablePush, enablePush } from './actions';

const noop = () => () => {};

/**
 * Notificaciones en ESTE dispositivo (§9.5, ADR-013). Cada teléfono o computadora se activa por separado;
 * el permiso solo se pide después de que la persona toca el botón.
 */
export function PushToggle({ vapidKey }: { vapidKey?: string }) {
  const support = useSyncExternalStore(noop, pushSupport, () => 'unsupported' as const);
  const [active, setActive] = useState<boolean | null>(null);
  const [pending, start] = useTransition();
  const toast = useToast();

  useEffect(() => {
    let alive = true;
    currentSubscription().then((s) => alive && setActive(!!s)).catch(() => alive && setActive(false));
    return () => {
      alive = false;
    };
  }, []);

  if (!vapidKey) {
    return <Notice tone="neutral">Las notificaciones en el teléfono se activan cuando se publique la aplicación. Mientras tanto, todo llega a la campana.</Notice>;
  }
  if (support === 'ios_needs_install') {
    return (
      <Notice tone="neutral">
        En iPhone, primero instala la aplicación: toca <Share className="inline size-4 align-[-2px]" aria-label="Compartir" /> <strong>Compartir</strong> →{' '}
        <strong>Añadir a pantalla de inicio</strong>, abre SR Conecta desde el ícono y vuelve aquí.
      </Notice>
    );
  }
  if (support === 'unsupported') return <Notice tone="neutral">Este navegador no permite notificaciones. Todo seguirá llegando a la campana.</Notice>;
  if (support === 'denied' && !active) {
    return <Notice tone="warn">Bloqueaste las notificaciones de SR Conecta en este navegador. Para recibirlas, permítelas en los ajustes del sitio y vuelve aquí.</Notice>;
  }

  const turnOn = () =>
    start(async () => {
      try {
        const sub = await subscribeDevice(vapidKey);
        if (!sub) {
          toast.show('Sin permiso no podemos enviarte notificaciones. Todo seguirá llegando a la campana.', 'info');
          return;
        }
        const r = await enablePush(sub);
        if (r.status !== 'ok') {
          await unsubscribeDevice();
          toast.show(reasonMessage(r.reason), 'error');
          return;
        }
        setActive(true);
        toast.show('Listo: este dispositivo recibirá tus avisos.');
      } catch {
        toast.show('No pudimos activar las notificaciones en este navegador.', 'error');
      }
    });

  const turnOff = () =>
    start(async () => {
      const endpoint = await unsubscribeDevice();
      if (endpoint) await disablePush(endpoint);
      setActive(false);
      toast.show('Este dispositivo ya no recibirá notificaciones.');
    });

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-[12px] border border-line p-3">
      <span className={active ? 'text-brand' : 'text-subtle'} aria-hidden>
        {active ? <BellRing className="size-6" /> : <BellOff className="size-6" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">Notificaciones en este dispositivo</span>
        <span className="block text-sm text-muted" aria-live="polite">
          {active === null ? 'Comprobando…' : active ? 'Activadas. Te avisamos aunque la aplicación esté cerrada.' : 'Desactivadas. Solo verás los avisos en la campana.'}
        </span>
      </span>
      {active !== null && (
        <Button size="sm" variant={active ? 'secondary' : 'primary'} loading={pending} onClick={active ? turnOff : turnOn}>
          {active ? 'Desactivar' : 'Activar'}
        </Button>
      )}
    </div>
  );
}
