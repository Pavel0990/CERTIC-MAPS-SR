'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, ClipboardCheck, FileText, Inbox, ListChecks, ScrollText, Users, type LucideIcon } from 'lucide-react';
import { cn } from '@/utils/cn';

interface Item { href: string; label: string; icon: LucideIcon; exact?: boolean; admin?: boolean; provincial?: boolean }

/** Dos grupos, como en un panel de gestión: el trabajo del día y la administración. */
const GROUPS: { title: string; items: Item[] }[] = [
  {
    title: 'Gestión',
    items: [
      { href: '/admin', label: 'Resumen', icon: BarChart3, exact: true },
      { href: '/admin/bandeja', label: 'Bandeja', icon: Inbox },
      { href: '/admin/validaciones', label: 'Validaciones', icon: ClipboardCheck },
    ],
  },
  {
    title: 'Administración',
    items: [
      { href: '/admin/informes', label: 'Informes', icon: FileText, admin: true },
      { href: '/admin/equipo', label: 'Equipo', icon: Users, admin: true },
      { href: '/admin/auditoria', label: 'Auditoría', icon: ScrollText, admin: true },
      { href: '/admin/catalogos', label: 'Catálogos', icon: ListChecks, admin: true, provincial: true },
    ],
  },
];

export function AdminNav({ isAdmin, isProvincialAdmin, counts }: { isAdmin: boolean; isProvincialAdmin: boolean; counts: { inbox: number; validations: number } }) {
  const pathname = usePathname();
  const visible = (i: Item) => (!i.admin || isAdmin) && (!i.provincial || isProvincialAdmin);
  const groups = GROUPS.map((g) => ({ ...g, items: g.items.filter(visible) })).filter((g) => g.items.length);
  const isActive = (i: Item) => (i.exact ? pathname === i.href : pathname.startsWith(i.href));
  const badgeOf = (i: Item) => (i.href === '/admin/bandeja' ? counts.inbox : i.href === '/admin/validaciones' ? counts.validations : 0);

  return (
    <>
      {/* Teléfono y tableta: pestañas que se deslizan */}
      <nav aria-label="Panel municipal" className="-mx-4 mb-5 flex gap-1 overflow-x-auto px-4 [scrollbar-width:none] lg:hidden print:hidden">
        {groups.flatMap((g) => g.items).map((i) => {
          const active = isActive(i);
          const badge = badgeOf(i);
          return (
            <Link key={i.href} href={i.href} aria-current={active ? 'page' : undefined}
              className={cn('press inline-flex h-11 shrink-0 items-center gap-2 rounded-[12px] px-3.5 text-[15px] font-semibold',
                active ? 'bg-ink text-white' : 'bg-surface text-muted shadow-[var(--shadow-card)] hover:text-ink')}>
              <i.icon className="size-4" aria-hidden />
              {i.label}
              {badge > 0 && <span className={cn('rounded-full px-2 font-mono text-[13px] font-bold', active ? 'bg-white/20' : 'bg-danger text-white')}>{badge}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Computadora: barra lateral con secciones */}
      <nav aria-label="Panel municipal" className="sticky top-6 hidden w-[232px] shrink-0 self-start rounded-[20px] border border-line bg-surface p-3 shadow-[var(--shadow-card)] lg:block print:hidden">
        {groups.map((g, gi) => (
          <div key={g.title} className={cn(gi > 0 && 'mt-3 border-t border-line pt-3')}>
            <p className="px-3 pb-2 pt-1 text-[14px] font-semibold text-subtle">{g.title}</p>
            <ul className="flex flex-col gap-0.5">
              {g.items.map((i) => {
                const active = isActive(i);
                const badge = badgeOf(i);
                return (
                  <li key={i.href}>
                    <Link href={i.href} aria-current={active ? 'page' : undefined}
                      className={cn('press relative flex min-h-11 items-center gap-3 rounded-[12px] px-3 text-[15px] font-semibold',
                        active ? 'bg-brand-soft text-brand-strong' : 'text-muted hover:bg-canvas hover:text-ink')}>
                      {active && <span className="absolute -left-3 top-2 bottom-2 w-1 rounded-r-full bg-brand" aria-hidden />}
                      <i.icon className="size-[18px] shrink-0" aria-hidden />
                      <span className="flex-1">{i.label}</span>
                      {badge > 0 && <span className="rounded-full bg-danger px-2 py-px font-mono text-[13px] font-bold text-white">{badge}<span className="sr-only"> pendientes</span></span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </>
  );
}
