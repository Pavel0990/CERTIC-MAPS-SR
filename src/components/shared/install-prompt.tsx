'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Download, Share, SquarePlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isIos, isStandalone } from '@/lib/pwa';

/** Evento de Chrome/Android para instalar la app (no está en los tipos de TypeScript) */
interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const HIDDEN_KEY = 'sr-instalar-oculto';
/** "Ahora no" lo calla una semana; después se vuelve a ofrecer */
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;
/** Espera antes de ofrecerlo: primero que la persona vea la app */
const DELAY_MS = 4000;
/** Solo en las pantallas de explorar, nunca a mitad de un formulario */
const PAGES = ['/', '/mapa', '/negocios', '/turismo', '/rutas'];
/** Navegadores dentro de otras apps: desde ahí no se puede instalar */
const IN_APP = /FBAN|FBAV|Instagram|WhatsApp|Line\/|TikTok|Snapchat|; wv\)/i;

// Chrome puede avisar antes de que React monte el componente: se guarda el aviso desde que carga el código
let deferred: InstallEvent | null = null;
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // sin esto Chrome muestra su propia barra, que la gente no reconoce
    deferred = e as InstallEvent;
  });
}

function snoozed() {
  try {
    return Date.now() - Number(localStorage.getItem(HIDDEN_KEY) ?? 0) < SNOOZE_MS;
  } catch {
    return false;
  }
}
function snooze(forever = false) {
  try {
    localStorage.setItem(HIDDEN_KEY, String(forever ? Number.MAX_SAFE_INTEGER / 2 : Date.now()));
  } catch {
    // sin almacenamiento solo se calla en esta visita
  }
}

type Kind = 'prompt' | 'ios' | 'in_app' | 'menu';

/**
 * En el teléfono, ofrece instalar SR Conecta en la pantalla de inicio (abre más rápido y funciona sin señal).
 * Android/Chrome: un toque abre la ventana de instalación del teléfono. iPhone: los pasos de Safari.
 * Desde WhatsApp o Instagram: pide abrir el enlace en el navegador, porque ahí no se puede instalar.
 */
export function InstallPrompt() {
  const pathname = usePathname();
  const [kind, setKind] = useState<Kind | null>(null);
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    const phone = window.matchMedia('(max-width: 767px) and (pointer: coarse)').matches;
    if (!phone || isStandalone() || snoozed()) return;
    const onInstalled = () => { snooze(true); setKind(null); };
    window.addEventListener('appinstalled', onInstalled);
    const t = window.setTimeout(() => {
      const ua = navigator.userAgent;
      // En iPhone el navegador de WhatsApp sí es Safari por dentro, pero no tiene «Añadir a pantalla de inicio»
      setKind(IN_APP.test(ua) ? 'in_app' : deferred ? 'prompt' : isIos() ? 'ios' : 'menu');
    }, DELAY_MS);
    return () => { window.clearTimeout(t); window.removeEventListener('appinstalled', onInstalled); };
  }, []);

  if (!kind || closed || !PAGES.includes(pathname)) return null;

  function later() {
    snooze();
    setClosed(true);
  }
  async function install() {
    const e = deferred;
    if (!e) return setKind('menu');
    deferred = null;
    await e.prompt();
    const { outcome } = await e.userChoice;
    if (outcome === 'accepted') snooze(true);
    else snooze();
    setClosed(true);
  }

  return (
    <div
      role="dialog"
      aria-labelledby="instalar-titulo"
      className="animate-sheet-in fixed inset-x-3 bottom-[calc(80px+env(safe-area-inset-bottom))] z-[65] mx-auto max-w-md rounded-[20px] bg-surface p-4 shadow-[var(--shadow-float)] ring-1 ring-line"
    >
      <div className="flex items-start gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element -- ícono fijo de la app, ya en caché */}
        <img src="/icons/icon-192.png" alt="" width={48} height={48} className="size-12 shrink-0 rounded-[12px]" />
        <div className="min-w-0 flex-1">
          <p id="instalar-titulo" className="text-[17px] font-bold leading-tight">¿Quieres instalar SR Conecta?</p>
          <p className="mt-0.5 text-[15px] text-muted">Queda como app en tu teléfono, abre más rápido y funciona sin señal. Es gratis.</p>
        </div>
        <button type="button" onClick={later} aria-label="Cerrar" className="press -mr-1 -mt-1 flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-canvas">
          <X className="size-5" />
        </button>
      </div>

      {kind === 'prompt' && (
        <div className="mt-3 flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={later}>Ahora no</Button>
          <Button className="flex-1" onClick={install}><Download className="size-5" aria-hidden /> Instalar</Button>
        </div>
      )}
      {kind === 'ios' && (
        <ol className="mt-3 flex flex-col gap-2 text-[16px]">
          <li className="flex items-start gap-2"><Step n={1} /><span>Toca <Share className="inline size-5 align-[-4px] text-brand" aria-label="Compartir" /> abajo en Safari</span></li>
          <li className="flex items-start gap-2"><Step n={2} /><span>Baja y toca <SquarePlus className="inline size-5 align-[-4px]" aria-hidden /> <strong>Añadir a pantalla de inicio</strong></span></li>
          <li className="flex items-start gap-2"><Step n={3} /><span>Toca <strong>Añadir</strong></span></li>
        </ol>
      )}
      {kind === 'menu' && (
        <ol className="mt-3 flex flex-col gap-2 text-[16px]">
          <li className="flex items-start gap-2"><Step n={1} /><span>Toca el menú <strong className="text-[20px] leading-none">⋮</strong> arriba a la derecha</span></li>
          <li className="flex items-start gap-2"><Step n={2} /><span>Toca <strong>Instalar app</strong> o <strong>Añadir a pantalla de inicio</strong></span></li>
        </ol>
      )}
      {kind === 'in_app' && (
        <p className="mt-3 rounded-[14px] bg-canvas p-3 text-[16px]">
          Estás dentro de otra app. Toca el menú <strong>⋮</strong> o <strong>···</strong> y elige <strong>Abrir en el navegador</strong> (Chrome o Safari). Desde ahí podrás instalarla.
        </p>
      )}
      {kind !== 'prompt' && <Button variant="ghost" size="sm" className="mt-2 w-full text-muted" onClick={later}>Ahora no</Button>}
    </div>
  );
}

function Step({ n }: { n: number }) {
  return <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[14px] font-bold text-brand-strong" aria-hidden>{n}</span>;
}
