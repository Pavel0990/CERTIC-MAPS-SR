import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { Eyebrow } from '@/components/ui/primitives';
import { cn } from '@/utils/cn';

/** Contenedor de las páginas de contenido (no mapa): ancho legible y encabezado consistente. */
export function PageShell({
  title,
  eyebrow,
  description,
  back,
  actions,
  children,
  wide,
}: {
  title: string;
  eyebrow?: string;
  description?: ReactNode;
  back?: { href: string; label: string };
  actions?: ReactNode;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={cn('mx-auto w-full px-4 pb-10 pt-5 md:px-8 md:pt-8', wide ? 'max-w-6xl' : 'max-w-3xl')}>
      {back && (
        <Link href={back.href} className="-ml-2 mb-3 inline-flex h-10 items-center gap-1 rounded-full px-2 text-[15px] font-semibold text-muted hover:bg-surface hover:text-ink">
          <ChevronLeft className="size-5" aria-hidden /> {back.label}
        </Link>
      )}
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
          <h1 className="text-[28px] font-extrabold leading-tight md:text-[34px]">{title}</h1>
          {description && <div className="mt-1.5 text-[17px] text-muted">{description}</div>}
        </div>
        {actions}
      </header>
      {children}
    </div>
  );
}

/** Pestañas por enlace (estado en la URL, compartible y accesible). */
export function LinkTabs({ tabs, active }: { tabs: { href: string; label: string; count?: number }[]; active: string }) {
  return (
    <nav aria-label="Secciones" className="mb-5 flex gap-1 rounded-[14px] bg-[#e9ebee] p-1">
      {tabs.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          aria-current={active === t.href ? 'page' : undefined}
          className={cn('flex h-10 flex-1 items-center justify-center gap-1.5 rounded-[11px] px-3 text-[15px] font-semibold transition', active === t.href ? 'bg-surface shadow-sm' : 'text-muted hover:text-ink')}
        >
          {t.label}
          {t.count !== undefined && <span className="rounded-full bg-canvas px-1.5 text-[12px]">{t.count}</span>}
        </Link>
      ))}
    </nav>
  );
}
