import { cn } from '@/utils/cn';

/**
 * Marca de SR Conecta: un pin de mapa (todo ocurre sobre el mapa) con la montaña de la Cordillera Central y el sol
 * dorado dentro (territorio y ecoturismo), sobre un degradado del azul de la app al verde azulado de las rutas.
 * Misma figura que public/icons/icon.svg (ícono de la PWA).
 */
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={cn('size-10', className)} role="img" aria-label="SR Conecta">
      <defs>
        <linearGradient id="sr-logo-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#1d4ed8" /><stop offset="1" stopColor="#0e9f9a" /></linearGradient>
        <clipPath id="sr-logo-clip"><circle cx="24" cy="20.6" r="7.4" /></clipPath>
      </defs>
      <rect width="48" height="48" rx="13" fill="url(#sr-logo-bg)" />
      <path d="M24 7.2c-7.5 0-13.2 5.6-13.2 12.9 0 9 13.2 20.7 13.2 20.7s13.2-11.7 13.2-20.7C37.2 12.8 31.5 7.2 24 7.2z" fill="#fff" />
      <circle cx="24" cy="20.6" r="7.4" fill="#1e3a8a" />
      <g clipPath="url(#sr-logo-clip)">
        <path d="M15 29l6.2-9.2 3.4 4.4 2.5-3.1 6.9 7.9z" fill="#5eead4" />
        <path d="M21.2 19.8l1.6 2.1-1 .9-1.3-1.1z" fill="#fff" opacity=".9" />
      </g>
      <circle cx="27.4" cy="16.5" r="2" fill="#f2b01e" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="flex items-center gap-2.5">
      <Logo className="size-9" />
      <span className="leading-tight">
        <span className="block font-display text-[18px] font-extrabold">SR Conecta</span>
        <span className="block text-[14px] text-muted">El territorio está vivo</span>
      </span>
    </span>
  );
}
