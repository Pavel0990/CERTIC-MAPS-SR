import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'dark' | 'soft';
type Size = 'sm' | 'md' | 'lg';

const variants: Record<Variant, string> = {
  primary: 'bg-brand text-on-brand hover:bg-brand-strong shadow-sm',
  dark: 'bg-ink text-on-ink hover:bg-ink-strong',
  secondary: 'bg-surface text-ink border border-line-strong hover:bg-canvas',
  soft: 'bg-brand-soft text-brand-strong hover:bg-brand-soft-strong',
  ghost: 'text-ink hover:bg-canvas',
  danger: 'bg-surface text-danger-strong border border-danger-line hover:bg-danger-soft',
};
const sizes: Record<Size, string> = {
  sm: 'h-11 md:h-9 px-3 text-sm gap-1.5 rounded-full',
  md: 'h-11 px-4 text-[15px] gap-2 rounded-full',
  lg: 'h-13 px-5 text-base gap-2.5 rounded-full min-h-[52px]',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
  block?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, icon, block, className, children, disabled, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'press inline-flex select-none items-center justify-center font-semibold disabled:cursor-not-allowed disabled:opacity-55',
        variants[variant],
        sizes[size],
        block && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
});

/** Botón solo con ícono: exige una etiqueta accesible. */
export function IconButton({
  label,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        'press inline-flex size-11 items-center justify-center rounded-full bg-surface text-ink shadow-[var(--shadow-card)] hover:bg-canvas disabled:opacity-50',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
