import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

/** Filtros como botones grandes (sin menús desplegables): se entienden de un vistazo y se tocan fácil. */
export function FilterChips({ label, options, active, hrefFor }: {
  label: string;
  options: { value: string; label: string; icon?: ReactNode }[];
  active: string;
  hrefFor: (value: string) => string;
}) {
  return (
    <nav aria-label={label} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:flex-wrap md:px-0">
      {[{ value: '', label: 'Todos' }, ...options].map((o) => (
        <Link
          key={o.value || 'todos'}
          href={hrefFor(o.value)}
          aria-current={active === o.value ? 'true' : undefined}
          className={cn(
            'inline-flex h-11 shrink-0 items-center gap-2 rounded-full px-4 text-[15px] font-semibold transition',
            active === o.value ? 'bg-ink text-white' : 'bg-surface text-ink shadow-[var(--shadow-card)] hover:bg-canvas',
          )}
        >
          {o.icon}
          {o.label}
        </Link>
      ))}
    </nav>
  );
}

/** Fila de un listado: toda la fila lleva a la ficha; la acción (p. ej. Llamar) va aparte. */
export function ListRow({ href, icon, iconClass, title, subtitle, badge, action }: {
  href: string;
  icon: ReactNode;
  iconClass?: string;
  title: string;
  subtitle: string;
  badge?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <li className="flex items-center gap-2 border-b border-line last:border-0">
      <Link href={href} className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 hover:bg-canvas md:px-5">
        <span className={cn('grid size-12 shrink-0 place-items-center rounded-[14px]', iconClass ?? 'bg-brand-soft text-brand-strong')} aria-hidden>
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[17px] font-semibold leading-snug">{title}</span>
          <span className="block text-[15px] text-muted">{subtitle}</span>
          {badge && <span className="mt-1 block">{badge}</span>}
        </span>
        {!action && <ChevronRight className="size-5 shrink-0 text-subtle" aria-hidden />}
      </Link>
      {action && <span className="shrink-0 pr-4 md:pr-5">{action}</span>}
    </li>
  );
}

export function OsmCredit() {
  return (
    <p className="mt-4 text-sm text-muted">
      Datos de los propios negocios y del municipio, y de{' '}
      <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="underline">© colaboradores de OpenStreetMap</a>.
    </p>
  );
}
