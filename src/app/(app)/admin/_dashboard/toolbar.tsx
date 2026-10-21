'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { Download, Printer, RefreshCw } from 'lucide-react';
import { PERIODS, toCsv } from '@/modules/admin';
import { cn } from '@/utils/cn';

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
  const time = new Intl.DateTimeFormat('es-DO', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Santo_Domingo' }).format(new Date(updatedAt));

  function download() {
    const url = URL.createObjectURL(new Blob([toCsv(csv)], { type: 'text/csv;charset=utf-8' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: csvName });
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between print:hidden">
      <nav aria-label="Periodo" className="inline-flex self-start rounded-full bg-ink p-1 shadow-[var(--shadow-card)]">
        {PERIODS.map((d) => (
          <Link key={d} href={hrefFor(d)} scroll={false} aria-current={d === days ? 'true' : undefined}
            className={cn('press inline-flex min-h-11 items-center rounded-full px-4 text-[15px] font-semibold md:min-h-10', d === days ? 'bg-surface text-ink' : 'text-on-ink/75 hover:text-on-ink')}>
            {d} días
          </Link>
        ))}
      </nav>
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-sm text-muted" aria-live="polite">{pending ? 'Actualizando…' : `Actualizado a las ${time}`}</span>
        <IconAction label="Actualizar" onClick={() => start(() => router.refresh())} spin={pending}><RefreshCw className="size-4" /></IconAction>
        <IconAction label="Descargar CSV" onClick={download}><Download className="size-4" /></IconAction>
        <IconAction label="Imprimir" onClick={() => window.print()}><Printer className="size-4" /></IconAction>
      </div>
    </div>
  );
}

function IconAction({ label, onClick, children, spin }: { label: string; onClick: () => void; children: React.ReactNode; spin?: boolean }) {
  return (
    <button type="button" onClick={onClick} title={label}
      className="press inline-flex h-11 items-center gap-2 rounded-full border border-line bg-surface px-3.5 text-sm font-semibold text-ink hover:bg-canvas md:h-10">
      <span className={cn(spin && 'animate-spin')} aria-hidden>{children}</span>
      <span className="max-sm:sr-only">{label}</span>
    </button>
  );
}
