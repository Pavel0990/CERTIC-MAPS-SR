import Link from 'next/link';
import { Card } from '@/components/ui/primitives';
import { cn } from '@/utils/cn';
import { formatNumber } from '@/utils/format';

// Piezas de diseño del resumen: tarjeta con título, barras, estado vacío y píldora de filtro.

export function Panel({ title, sub, action, icon, children }: { title: string; sub?: string; action?: { href: string; label: string }; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card className="flex flex-col border border-line p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-[17px] font-bold">{icon}{title}</h3>
          {sub && <p className="text-sm text-muted">{sub}</p>}
        </div>
        {action && <Link prefetch={false} href={action.href} className="press -my-2 -mr-2 inline-flex min-h-11 shrink-0 items-center px-2 text-sm font-semibold text-brand hover:underline print:hidden">{action.label}</Link>}
      </div>
      {children}
    </Card>
  );
}

export function Bars({ rows, color }: { rows: { key: string; label: string; value: number; extra?: string; href?: string }[]; color: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((r) => {
        const inner = (
          <>
            <div className="mb-1 flex items-baseline justify-between gap-2 text-[15px]">
              <span className="truncate font-semibold">{r.label}</span>
              <span className="font-semibold tabular-nums text-muted">{formatNumber(r.value)}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-track" aria-hidden>
              <div className={cn('kpi-bar h-full rounded-full', color)} style={{ width: `${Math.max(r.value ? 4 : 0, (r.value / max) * 100)}%` }} />
            </div>
            {r.extra && <p className="mt-1 text-[13px] text-muted">{r.extra}</p>}
          </>
        );
        return <li key={r.key}>{r.href ? <Link prefetch={false} href={r.href} className="press-soft -mx-2 block rounded-[12px] p-2 transition-colors duration-200 hover:bg-canvas">{inner}</Link> : inner}</li>;
      })}
    </ul>
  );
}

/** Sin datos: corto, con un ícono suave, y sin ocupar media pantalla. */
export function Empty({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 py-6 text-center">
      <span className="grid size-10 place-items-center rounded-full bg-canvas text-subtle [&>svg]:size-5" aria-hidden>{icon}</span>
      <p className="max-w-xs text-[15px] text-muted">{children}</p>
    </div>
  );
}

export function Pill({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link prefetch={false} href={href} scroll={false} aria-current={active ? 'page' : undefined}
      className={cn('press inline-flex min-h-11 shrink-0 items-center rounded-full px-4 text-[15px] font-semibold transition-colors duration-200', active ? 'bg-ink text-on-ink' : 'bg-surface text-muted shadow-[var(--shadow-card)] hover:text-ink')}>
      {children}
    </Link>
  );
}
