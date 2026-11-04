'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { Download, Printer, RefreshCw } from 'lucide-react';
import { PERIODS, toCsv } from '@/modules/admin';
import { cn } from '@/utils/cn';
import { APP_TIMEZONE } from '@/utils/locale';

/** Periodo (7/30/90 días, en la URL para compartir el enlace), hora de actualización, actualizar, CSV e imprimir. */
export function DashboardToolbar({ days, municipio, updatedAt, csv, csvName }: {
  days: number;
  municipio: string | null;
  updatedAt: string;
  csv: (string | number | null)[][];
  csvName: string;
}) {
  const router = useRouter();
  const hrefFor = (d: number) => `/admin?periodo=${d}${municipio ? `&municipio=${municipio}` : ''}`;
  const [pending, start] = useTransition();
  const time = new Intl.DateTimeFormat('es-DO', { hour: 'numeric', minute: '2-digit', timeZone: APP_TIMEZONE }).format(new Date(updatedAt));

  function download() {
    const url = URL.createObjectURL(new Blob([toCsv(csv)], { type: 'text/csv;charset=utf-8' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: csvName });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000); // liberarla en el mismo instante cancela la descarga en algunos navegadores
  }

  return (
    <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between print:hidden">
      <nav aria-label="Periodo" className="inline-flex shrink-0 self-start rounded-full bg-ink p-1 shadow-[var(--shadow-card)]">
        {PERIODS.map((d) => (
          <Link prefetch={false} key={d} href={hrefFor(d)} scroll={false} aria-current={d === days ? 'true' : undefined}
            className={cn('press inline-flex min-h-11 items-center whitespace-nowrap rounded-full px-4 text-[15px] font-semibold', d === days ? 'bg-surface text-ink' : 'text-on-ink/75 hover:text-on-ink')}>
            {d} días
          </Link>
        ))}
      </nav>
      <div className="flex flex-wrap items-center gap-2">
        <span className="w-full text-sm text-muted xl:mr-1 xl:w-auto" aria-live="polite">{pending ? 'Actualizando…' : `Actualizado a las ${time}`}</span>
        <IconAction label="Actualizar" onClick={() => start(() => router.refresh())} spin={pending}><RefreshCw className="size-4" /></IconAction>
        {/* El archivo es CSV, pero quien lo usa lo reconoce como "Excel", que es donde se abre */}
        <IconAction label="Descargar Excel" onClick={download}><Download className="size-4" /></IconAction>
        {/* En el teléfono casi nadie imprime: sin este botón, las acciones caben en una línea */}
        <IconAction label="Imprimir" onClick={() => window.print()} className="hidden sm:inline-flex"><Printer className="size-4" /></IconAction>
      </div>
    </div>
  );
}

function IconAction({ label, onClick, children, spin, className }: { label: string; onClick: () => void; children: React.ReactNode; spin?: boolean; className?: string }) {
  return (
    <button type="button" onClick={onClick} title={label}
      className={cn('press inline-flex h-11 items-center gap-2 rounded-full border border-line bg-surface px-3.5 text-sm font-semibold text-ink transition-colors duration-200 hover:border-line-strong hover:bg-canvas', className)}>
      <span className={cn(spin && 'animate-spin')} aria-hidden>{children}</span>
      {/* Ícono y texto también en el teléfono (§6.2): un ícono solo no dice qué hace */}
      {label}
    </button>
  );
}
