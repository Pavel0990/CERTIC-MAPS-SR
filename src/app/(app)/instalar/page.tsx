import type { Metadata } from 'next';
import { BellRing, WifiOff, Zap } from 'lucide-react';
import { Card } from '@/components/ui/primitives';
import { InstallPanel } from './install-panel';

export const metadata: Metadata = {
  title: 'Instalar la app',
  description: 'Instala SR Conecta en tu teléfono: abre más rápido, funciona sin señal y te avisa de tus reportes. Gratis.',
};

const BENEFITS = [
  { icon: Zap, text: 'Abre más rápido, desde un ícono en tu pantalla de inicio' },
  { icon: WifiOff, text: 'Funciona sin señal: ves el mapa y tus reportes se envían al volver la conexión' },
  { icon: BellRing, text: 'Te avisa cuando tu reporte cambia de estado' },
];

/** Página para instalar la app (también para la demo: se abre en el teléfono desde un enlace o código QR). */
export default function InstallPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 px-4 py-8">
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element -- ícono fijo de la app, ya en caché */}
        <img src="/icons/icon-192.png" alt="" width={56} height={56} className="size-14 shrink-0 rounded-[14px]" />
        <div>
          <h1 className="text-2xl font-bold leading-tight">Instala SR Conecta</h1>
          <p className="text-[15px] text-muted">Gratis · Android, iPhone y computadora</p>
        </div>
      </div>
      <Card className="p-5">
        <InstallPanel />
      </Card>
      <ul className="flex flex-col gap-3 px-1">
        {BENEFITS.map(({ icon: Icon, text }) => (
          <li key={text} className="flex items-start gap-3 text-[16px]">
            <Icon className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden />
            {text}
          </li>
        ))}
      </ul>
    </div>
  );
}
