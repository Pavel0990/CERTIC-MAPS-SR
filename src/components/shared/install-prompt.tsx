'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Download, Share, SquarePlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isIos, isStandalone } from '@/lib/pwa';
import { cn } from '@/utils/cn';

/** Evento de Chrome/Android para instalar la app (no está en los tipos de TypeScript) */
interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const HIDDEN_KEY = 'sr-instalar-oculto';
/** "Ahora no" lo calla una semana; después se vuelve a ofrecer */
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;
/** Espera antes de ofrecerlo: primero que la persona use la app (a los 4 s tapaba el mapa recién abierto) */
const DELAY_MS = 30000;
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

export type InstallKind = 'prompt' | 'ios' | 'in_app' | 'menu';

/** Cómo se instala en este navegador. Se llama en el cliente, después de montar. */
export function installKind(): InstallKind {
  // En iPhone el navegador de WhatsApp sí es Safari por dentro, pero no tiene «Añadir a pantalla de inicio»
  return IN_APP.test(navigator.userAgent) ? 'in_app' : deferred ? 'prompt' : isIos() ? 'ios' : 'menu';
}

/** Abre la ventana de instalación del teléfono. `null` si el navegador ya no la ofrece (usar los pasos del menú). */
export async function promptInstall() {
  const e = deferred;
  if (!e) return null;
  deferred = null;
  await e.prompt();
  const { outcome } = await e.userChoice;
  if (outcome === 'accepted') snooze(true);
  else snooze();
  return outcome;
}

/**
 * En el teléfono, ofrece instalar SR Conecta en la pantalla de inicio (abre más rápido y funciona sin señal).
 * Android/Chrome: un toque abre la ventana de instalación del teléfono. En los demás casos (iPhone, otro navegador,
 * dentro de WhatsApp o Instagram), "Ver cómo" lleva a /instalar, que explica los pasos de cada uno.
 */
export function InstallPrompt() {
  const pathname = usePathname();
  const [kind, setKind] = useState<InstallKind | null>(null);
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    const phone = window.matchMedia('(max-width: 767px) and (pointer: coarse)').matches;
    if (!phone || isStandalone() || snoozed()) return;
    const onInstalled = () => { snooze(true); setKind(null); };
    window.addEventListener('appinstalled', onInstalled);
    const t = window.setTimeout(() => setKind(installKind()), DELAY_MS);
    return () => { window.clearTimeout(t); window.removeEventListener('appinstalled', onInstalled); };
  }, []);

  if (!kind || closed || !PAGES.includes(pathname)) return null;

  function later() {
    snooze();
    setClosed(true);
  }
  async function install() {
    if (!(await promptInstall())) return setKind('menu');
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
          <p className="mt-0.5 text-[15px] text-muted">Abre más rápido y funciona sin señal. Gratis.</p>
        </div>
        <button type="button" onClick={later} aria-label="Cerrar" className="press -mr-1 -mt-1 flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-canvas">
          <X className="size-5" />
        </button>
      </div>

      {/* Compacto para no tapar el mapa: los pasos a mano (iPhone, otros navegadores) están en /instalar */}
      <div className="mt-3 flex gap-2">
        <Button variant="ghost" className="flex-1" onClick={later}>Ahora no</Button>
        {kind === 'prompt' ? (
          <Button className="flex-1" onClick={install}><Download className="size-5" aria-hidden /> Instalar</Button>
        ) : (
          <Link prefetch={false} href="/instalar" onClick={later} className="press inline-flex h-11 flex-1 items-center justify-center rounded-full bg-brand px-4 text-[15px] font-semibold text-on-brand shadow-sm hover:bg-brand-strong">
            Ver cómo
          </Link>
        )}
      </div>
    </div>
  );
}

/** Los pasos a mano cuando el navegador no ofrece su ventana de instalación (también en /instalar). */
export function InstallSteps({ kind, className }: { kind: Exclude<InstallKind, 'prompt'>; className?: string }) {
  if (kind === 'in_app') {
    return (
      <p className={cn('rounded-[14px] bg-canvas p-3 text-[16px]', className)}>
        Estás dentro de otra app. Toca el menú <strong>⋮</strong> o <strong>···</strong> y elige <strong>Abrir en el navegador</strong> (Chrome o Safari). Desde ahí podrás instalarla.
      </p>
    );
  }
  return (
    <ol className={cn('flex flex-col gap-2 text-[16px]', className)}>
      {kind === 'ios' ? (
        <>
          <li className="flex items-start gap-2"><Step n={1} /><span>Toca <Share className="inline size-5 align-[-4px] text-brand" aria-label="Compartir" /> abajo en Safari</span></li>
          <li className="flex items-start gap-2"><Step n={2} /><span>Baja y toca <SquarePlus className="inline size-5 align-[-4px]" aria-hidden /> <strong>Añadir a pantalla de inicio</strong></span></li>
          <li className="flex items-start gap-2"><Step n={3} /><span>Toca <strong>Añadir</strong></span></li>
        </>
      ) : (
        <>
          <li className="flex items-start gap-2"><Step n={1} /><span>Toca el menú del navegador (<strong className="text-[20px] leading-none">⋮</strong> o <strong className="text-[20px] leading-none">≡</strong>)</span></li>
          <li className="flex items-start gap-2"><Step n={2} /><span>Toca <strong>Instalar app</strong> o <strong>Añadir a pantalla de inicio</strong></span></li>
        </>
      )}
    </ol>
  );
}

function Step({ n }: { n: number }) {
  return <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[14px] font-bold text-brand-strong" aria-hidden>{n}</span>;
}
