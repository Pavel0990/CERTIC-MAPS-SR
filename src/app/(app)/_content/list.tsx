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
        <Link prefetch={false}
          key={o.value || 'todos'}
          href={hrefFor(o.value)}
          aria-current={active === o.value ? 'true' : undefined}
          className={cn(
            'press inline-flex h-11 shrink-0 items-center gap-2 rounded-full px-4 text-[15px] font-semibold',
            active === o.value ? 'bg-brand text-on-brand' : 'bg-surface text-ink shadow-[var(--shadow-card)] hover:bg-canvas',
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
    // En pantallas grandes la lista va en dos columnas (ListGrid): sin bordes sueltos al final
    <li className="flex items-center gap-2 border-b border-line last:border-0 lg:odd:border-r lg:[&:nth-last-child(2):nth-child(odd)]:border-b-0">
      {/* Se precarga al tocar o pasar el mouse, no al aparecer: una lista larga no dispara una petición por fila */}
      <Link href={href} prefetch={false} className="press-soft group flex min-w-0 flex-1 items-center gap-3 px-4 py-3 hover:bg-canvas active:bg-canvas md:px-5">
        <span className={cn('grid size-12 shrink-0 place-items-center rounded-[14px]', iconClass ?? 'bg-brand-soft text-brand-strong')} aria-hidden>
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[17px] font-semibold leading-snug">{title}</span>
          <span className="block text-[15px] text-muted">{subtitle}</span>
          {badge && <span className="mt-1 block">{badge}</span>}
        </span>
        {!action && <ChevronRight className="size-5 shrink-0 text-subtle transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-ink" aria-hidden />}
      </Link>
      {action && <span className="shrink-0 pr-4 md:pr-5">{action}</span>}
    </li>
  );
}

/** Contenedor de filas: una columna en teléfono y tableta, dos en computadora (filas cortas, fáciles de recorrer). */
export function ListGrid({ children }: { children: ReactNode }) {
  return <ul className="lg:grid lg:grid-cols-2">{children}</ul>;
}

/** Cuántas filas se muestran de entrada y cuántas más con cada «Ver más». */
export const PAGE_SIZE = 24;

/** Lee ?ver= de la URL: cuántas filas mostrar (en múltiplos de PAGE_SIZE). */
export function shownCount(ver: string | undefined) {
  const n = Number(ver);
  return Number.isInteger(n) && n > PAGE_SIZE ? Math.min(n, 1000) : PAGE_SIZE;
}

/**
 * La lista se carga por partes: primero lo que cabe en pantalla y, si la persona quiere, más.
 * Es un enlace normal (funciona sin JavaScript y se puede compartir) y no mueve la pantalla al tocarlo.
 */
export function ShowMore({ shown, total, href, noun }: { shown: number; total: number; href: string; noun: string }) {
  if (shown >= total) return null;
  const next = Math.min(PAGE_SIZE, total - shown);
  return (
    <div className="mt-4 flex flex-col items-center gap-1.5">
      <Link prefetch={false} href={href} scroll={false} className="press inline-flex min-h-[52px] items-center justify-center rounded-[14px] border border-line-strong bg-surface px-6 text-base font-semibold text-ink hover:bg-canvas">
        Ver {next} {noun} más
      </Link>
      <p className="text-[14px] text-muted">Mostrando {shown} de {total}</p>
    </div>
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
