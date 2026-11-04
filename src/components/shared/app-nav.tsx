'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, Home, LayoutDashboard, Map, Plus, Store, User } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { cn } from '@/utils/cn';
import { Logo } from './logo';

interface NavProps {
  signedIn: boolean;
  isStaff: boolean;
  isEntrepreneur: boolean;
  unread: number;
  avatar: { src: string | null; name: string } | null;
}

const TABS = [
  { href: '/', label: 'Inicio', icon: Home, match: (p: string) => p === '/' },
  { href: '/mapa', label: 'Mapa', icon: Map, match: (p: string) => p.startsWith('/mapa') },
  { href: '/reportar', label: 'Reportar', icon: Plus, match: (p: string) => p.startsWith('/reportar'), primary: true },
  { href: '/actividad', label: 'Actividad', icon: Activity, match: (p: string) => p.startsWith('/actividad') || p.startsWith('/consultas') },
  { href: '/perfil', label: 'Perfil', icon: User, match: (p: string) => p.startsWith('/perfil') || p.startsWith('/notificaciones') || p.startsWith('/entrar') },
];

export function AppNav({ signedIn, isStaff, isEntrepreneur, unread, avatar }: NavProps) {
  // Con sesión, la pestaña Perfil lleva la foto de la persona (o sus iniciales)
  const profileIcon = (size: number) => (avatar ? <Avatar src={avatar.src} name={avatar.name} size={size} priority /> : null);
  const pathname = usePathname();
  const tabs = TABS.map((t) => (t.href === '/perfil' && !signedIn ? { ...t, href: '/entrar', label: 'Entrar' } : t));

  return (
    <>
      {/* Escritorio y tableta: riel lateral */}
      {/* Con el teléfono en horizontal (poca altura) el riel se compacta y, si aun así no cabe, se desplaza */}
      <nav aria-label="Principal" className="fixed inset-y-0 left-0 z-40 hidden w-[88px] flex-col items-center gap-1 overflow-y-auto border-r border-line bg-surface py-4 md:flex short:gap-0.5 short:py-2">
        <Link href="/" aria-label="SR Conecta, inicio" className="mb-4 short:hidden">
          <Logo className="size-11" />
        </Link>
        {tabs.map((t) => (
          <RailLink key={t.href} href={t.href} label={t.label} active={t.match(pathname)} primary={t.primary} badge={t.href === '/perfil' ? unread : 0}>
            {(t.href === '/perfil' && profileIcon(24)) || <t.icon className="size-[22px]" aria-hidden />}
          </RailLink>
        ))}
        <div className="mt-auto flex flex-col items-center gap-1">
          {isEntrepreneur && (
            <RailLink href="/negocio" label="Mi negocio" active={pathname.startsWith('/negocio')}>
              <Store className="size-[22px]" aria-hidden />
            </RailLink>
          )}
          {isStaff && (
            <RailLink href="/admin" label="Panel" active={pathname.startsWith('/admin')}>
              <LayoutDashboard className="size-[22px]" aria-hidden />
            </RailLink>
          )}
        </div>
      </nav>

      {/* Móvil: barra inferior */}
      <nav aria-label="Principal" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <ul className="mx-auto flex h-[68px] max-w-lg items-stretch justify-around">
          {tabs.map((t) => {
            const active = t.match(pathname);
            return (
              <li key={t.href} className="flex min-w-0 flex-1">
                {/* En teléfonos de 320 px cada pestaña mide ~64 px: la letra baja un punto para que "Actividad" no choque */}
                <Link
                  href={t.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn('press relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 whitespace-nowrap text-[13px] font-semibold tracking-[-0.01em] min-[360px]:text-[14px] min-[360px]:tracking-normal', active ? 'text-ink' : 'text-subtle')}
                >
                  {t.primary ? (
                    <span className="flex size-11 items-center justify-center rounded-full bg-danger text-white shadow-[0_6px_16px_rgb(229_72_77/0.35)]">
                      <t.icon className="size-6" aria-hidden />
                    </span>
                  ) : (
                    <span className={cn('flex h-8 w-14 items-center justify-center rounded-full transition-colors duration-200', active && 'bg-brand-soft text-brand-strong')}>
                      {(t.href === '/perfil' && profileIcon(26)) || <t.icon className="size-[22px]" aria-hidden />}
                    </span>
                  )}
                  <span className={t.primary ? 'text-danger-strong' : undefined}>{t.label}</span>
                  {t.href === '/perfil' && unread > 0 && <Dot n={unread} />}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}

function RailLink({ href, label, active, primary, badge = 0, children }: { href: string; label: string; active: boolean; primary?: boolean; badge?: number; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'press relative flex w-[76px] shrink-0 flex-col items-center gap-1 rounded-[14px] px-1 py-2 text-center text-[14px] font-semibold leading-tight short:gap-0.5 short:py-1',
        primary ? 'text-danger-strong hover:bg-danger-soft' : active ? 'bg-brand-soft text-brand-strong' : 'text-muted hover:bg-canvas',
      )}
    >
      {primary ? <span className="flex size-10 items-center justify-center rounded-full bg-danger text-white">{children}</span> : children}
      {label}
      {badge > 0 && <Dot n={badge} />}
    </Link>
  );
}

function Dot({ n }: { n: number }) {
  return (
    <span className="absolute right-3 top-1 flex min-w-5 items-center justify-center rounded-full bg-danger px-1 text-[12px] font-bold text-white" aria-label={`${n} sin leer`}>
      {n > 9 ? '9+' : n}
    </span>
  );
}
