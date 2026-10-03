'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, ClipboardCheck, FileText, Inbox, ScrollText, Users } from 'lucide-react';
import { cn } from '@/utils/cn';

const ITEMS = [
  { href: '/admin', label: 'Resumen', icon: BarChart3, admin: false, exact: true },
  { href: '/admin/bandeja', label: 'Bandeja', icon: Inbox, admin: false },
  { href: '/admin/validaciones', label: 'Validaciones', icon: ClipboardCheck, admin: false },
  { href: '/admin/informes', label: 'Informes', icon: FileText, admin: true },
  { href: '/admin/equipo', label: 'Equipo', icon: Users, admin: true },
  { href: '/admin/auditoria', label: 'Auditoría', icon: ScrollText, admin: true },
];

export function AdminNav({ isAdmin, counts }: { isAdmin: boolean; counts: { inbox: number; validations: number } }) {
  const pathname = usePathname();
  const items = ITEMS.filter((i) => !i.admin || isAdmin);
  return (
    <nav aria-label="Panel municipal" className="-mx-4 mb-6 flex gap-1 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:px-0">
      {items.map((i) => {
        const active = i.exact ? pathname === i.href : pathname.startsWith(i.href);
        const badge = i.href === '/admin/bandeja' ? counts.inbox : i.href === '/admin/validaciones' ? counts.validations : 0;
        return (
          <Link
            key={i.href}
            href={i.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'inline-flex h-11 shrink-0 items-center gap-2 rounded-[12px] px-3.5 text-[15px] font-semibold transition',
              active ? 'bg-ink text-white' : 'bg-surface text-muted shadow-[var(--shadow-card)] hover:text-ink',
            )}
          >
            <i.icon className="size-4" aria-hidden />
            {i.label}
            {badge > 0 && (
              <span className={cn('rounded-full px-1.5 text-[12px] font-bold', active ? 'bg-white/20' : 'bg-danger text-white')}>{badge}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
