'use client';
import { useState } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { cn } from '@/utils/cn';

type Theme = 'auto' | 'light' | 'dark';
const OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: 'auto', label: 'Automático', icon: Monitor },
  { value: 'light', label: 'Claro', icon: Sun },
  { value: 'dark', label: 'Oscuro', icon: Moon },
];

/** Guarda la elección (cookie de un año, la lee el layout raíz) y la aplica al instante. */
function applyTheme(t: Theme) {
  document.cookie = t === 'auto' ? 'tema=; path=/; max-age=0; samesite=lax' : `tema=${t}; path=/; max-age=31536000; samesite=lax`;
  if (t === 'auto') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = t;
}

/**
 * Apariencia: la del teléfono (automático), clara u oscura. Se guarda en la cookie "tema" (un año), que el layout
 * raíz lee en el servidor para pintar el tema correcto desde el primer momento. Sin datos personales.
 */
export function ThemePicker({ initial }: { initial: Theme }) {
  const [theme, setTheme] = useState<Theme>(initial);

  function choose(t: Theme) {
    setTheme(t);
    applyTheme(t);
  }

  return (
    <fieldset>
      <legend className="text-[15px] font-semibold">Apariencia</legend>
      <p className="text-sm text-muted">El modo oscuro cansa menos la vista de noche y ahorra batería.</p>
      <div className="mt-3 grid grid-cols-3 gap-1 rounded-[14px] bg-track p-1">
        {OPTIONS.map((o) => (
          <button key={o.value} type="button" aria-pressed={theme === o.value} onClick={() => choose(o.value)}
            className={cn('press flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-[11px] px-2 py-1.5 text-[14px] font-semibold sm:flex-row sm:gap-2',
              theme === o.value ? 'bg-surface text-ink shadow-[var(--shadow-card)]' : 'text-muted hover:text-ink')}>
            <o.icon className="size-4" aria-hidden />
            {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
