'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CircleCheck, Download, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InstallSteps, installKind, promptInstall, type InstallKind } from '@/components/shared/install-prompt';
import { isStandalone } from '@/lib/pwa';

type State = InstallKind | 'installed' | 'computer' | null;

/** Lo que toca hacer en este dispositivo: un botón, los pasos a mano o, en la computadora, abrirla en el teléfono. */
export function InstallPanel() {
  const [state, setState] = useState<State>(null);

  useEffect(() => {
    const decide = () => {
      if (isStandalone()) return setState('installed');
      const phone = window.matchMedia('(pointer: coarse)').matches;
      const kind = installKind();
      // En la computadora Chrome también instala; si no lo ofrece, se explica cómo abrirla en el teléfono
      setState(!phone && kind !== 'prompt' ? 'computer' : kind);
    };
    decide();
    // Chrome puede ofrecer la instalación unos segundos después de cargar
    window.addEventListener('beforeinstallprompt', decide);
    const onInstalled = () => setState('installed');
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', decide);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  async function install() {
    const outcome = await promptInstall();
    if (!outcome) setState('menu');
    else if (outcome === 'accepted') setState('installed');
  }

  if (!state) return <p className="text-[16px] text-muted">Revisando tu teléfono…</p>;

  if (state === 'installed') {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="flex items-center gap-2 text-[17px] font-semibold text-ok"><CircleCheck className="size-5" aria-hidden /> Ya tienes la app instalada</p>
        <Link prefetch={false} href="/mapa" className="press inline-flex h-12 items-center rounded-full bg-ink px-5 font-semibold text-on-ink">Ir al mapa</Link>
      </div>
    );
  }

  if (state === 'computer') {
    return (
      <div className="flex flex-col gap-2 text-[16px]">
        <p className="flex items-center gap-2 font-semibold"><Smartphone className="size-5 text-brand" aria-hidden /> Ábrela en tu teléfono</p>
        <p className="text-muted">Escribe esta dirección en el navegador del teléfono (Chrome o Safari):</p>
        <p className="select-all rounded-[14px] bg-canvas p-3 text-center text-[18px] font-bold break-all">sr-conecta.vercel.app/instalar</p>
      </div>
    );
  }

  if (state === 'prompt') {
    return (
      <Button className="w-full" onClick={install}>
        <Download className="size-5" aria-hidden /> Instalar la app
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[17px] font-semibold">{state === 'in_app' ? 'Primero, ábrela en el navegador' : 'Así se instala:'}</p>
      <InstallSteps kind={state} />
    </div>
  );
}
