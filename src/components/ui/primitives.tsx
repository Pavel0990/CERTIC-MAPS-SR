import type { HTMLAttributes, ReactNode } from 'react';
import type { Tone } from '@/types/ui';
import { cn } from '@/utils/cn';

export type { Tone };

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-[18px] bg-surface shadow-[var(--shadow-card)]', className)} {...rest} />;
}

const tones: Record<Tone, string> = {
  neutral: 'bg-[#f1f2f4] text-[#4b5563]',
  brand: 'bg-brand-soft text-brand-strong',
  ok: 'bg-ok-soft text-ok',
  warn: 'bg-warn-soft text-warn',
  danger: 'bg-danger-soft text-danger-strong',
  violet: 'bg-violet-soft text-violet',
};

export function Badge({ tone = 'neutral', className, children }: { tone?: Tone; className?: string; children: ReactNode }) {
  return (
    <span className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[13px] font-semibold', tones[tone], className)}>
      {children}
    </span>
  );
}

/** Rótulo pequeño en mayúsculas (sección). */
export function Eyebrow({ className, children }: { className?: string; children: ReactNode }) {
  return <p className={cn('text-[12px] font-bold uppercase tracking-[0.08em] text-muted', className)}>{children}</p>;
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('animate-pulse rounded-[12px] bg-[#e9ebee]', className)} />;
}

/** Estado vacío: explica por qué no hay nada y qué hacer (§6.3). */
export function EmptyState({ icon, title, children, action }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
      {icon && <div className="flex size-14 items-center justify-center rounded-full bg-canvas text-muted">{icon}</div>}
      <p className="text-lg font-semibold">{title}</p>
      {children && <div className="max-w-sm text-[15px] text-muted">{children}</div>}
      {action}
    </div>
  );
}

/** Mensaje de error recuperable, sin detalles internos (§6.3). */
export function ErrorNote({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div role="alert" className="flex items-start gap-3 rounded-[14px] border border-[#f5c2c0] bg-danger-soft p-4 text-[15px] text-danger-strong">
      <div className="flex-1">{children}</div>
      {action}
    </div>
  );
}

export function Notice({ tone = 'brand', children }: { tone?: Tone; children: ReactNode }) {
  return <div className={cn('rounded-[14px] p-4 text-[15px]', tones[tone])}>{children}</div>;
}
