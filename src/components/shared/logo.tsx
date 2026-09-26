import { cn } from '@/utils/cn';

/** Marca de SR Conecta: montaña con un punto de ubicación (del prototipo). */
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={cn('size-10', className)} role="img" aria-label="SR Conecta">
      <rect width="48" height="48" rx="13" fill="#111418" />
      <path d="M10 33 20 18l6 8 4-5 8 12" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="31" cy="14" r="3.2" fill="#f2b01e" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="flex items-center gap-2.5">
      <Logo className="size-9" />
      <span className="leading-tight">
        <span className="block text-[15px] font-extrabold tracking-wide">SR CONECTA</span>
        <span className="block text-[12px] text-muted">El territorio está vivo</span>
      </span>
    </span>
  );
}
