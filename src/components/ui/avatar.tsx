import { cn } from '@/utils/cn';

/** Iniciales para cuando no hay foto: "Ana María Pérez" → "AP". */
export function initials(name: string) {
  // Sin lo que va entre paréntesis ni símbolos: "Ana Ciudadana (prueba)" → "AC"
  const parts = name.replace(/\([^)]*\)/g, ' ').split(/\s+/).map((w) => w.replace(/[^\p{L}\p{N}]/gu, '')).filter(Boolean);
  if (!parts.length) return '?';
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts.at(-1)?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}

/**
 * Foto de perfil redonda, o las iniciales si no hay. Se usa <img> sin optimizador de Next:
 * la foto ya viene en 256×256 WebP desde la CDN de Supabase, así que no hay nada que reprocesar.
 */
export function Avatar({ src, name, size = 40, className, priority = false }: { src: string | null; name: string; size?: number; className?: string; priority?: boolean }) {
  const style = { width: size, height: size, fontSize: Math.max(11, Math.round(size * 0.38)) };
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- archivo pequeño ya optimizado y cacheado por la CDN de Supabase
      <img src={src} alt="" width={size} height={size} loading={priority ? 'eager' : 'lazy'} decoding="async" style={style}
        className={cn('shrink-0 rounded-full bg-canvas object-cover', className)} />
    );
  }
  return (
    <span aria-hidden style={style} className={cn('inline-flex shrink-0 select-none items-center justify-center rounded-full bg-brand-soft font-bold text-brand-strong', className)}>
      {initials(name)}
    </span>
  );
}
