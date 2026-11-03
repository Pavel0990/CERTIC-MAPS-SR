import { Flame } from 'lucide-react';
import { LAYERS, type LayerId } from '@/modules/map';
import { cn } from '@/utils/cn';

/** Botones para mostrar u ocultar cada capa del mapa. */
export function LayerChips({ layers, onToggle, heat }: { layers: LayerId[]; onToggle: (id: LayerId) => void; heat?: { on: boolean; onToggle: () => void } }) {
  return (
    <div className="pointer-events-auto -mx-3 flex gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:none] md:mx-0 md:flex-wrap md:px-0" role="group" aria-label="Capas del mapa">
      {LAYERS.map((l) => {
        const on = layers.includes(l.id);
        return (
          <button
            key={l.id}
            type="button"
            aria-pressed={on}
            onClick={() => onToggle(l.id)}
            className={cn(
              'press inline-flex h-11 shrink-0 items-center gap-2 rounded-full px-3.5 text-[15px] font-semibold shadow-[var(--shadow-card)]',
              on ? 'bg-ink text-on-ink' : 'bg-surface text-muted',
            )}
          >
            <span className="size-2.5 rounded-full" style={{ background: on ? l.color : '#c9cdd3' }} aria-hidden />
            {l.label}
          </button>
        );
      })}
      {/* Capa de calor: dónde se concentran los reportes (solo si la capa está disponible) */}
      {heat && (
        <button
          type="button"
          aria-pressed={heat.on}
          onClick={heat.onToggle}
          className={cn(
            'press inline-flex h-11 shrink-0 items-center gap-2 rounded-full px-3.5 text-[15px] font-semibold shadow-[var(--shadow-card)]',
            heat.on ? 'bg-ink text-on-ink' : 'bg-surface text-muted',
          )}
        >
          <Flame className={cn('size-4', heat.on ? 'text-[#f97316]' : 'text-[#9aa0a8]')} aria-hidden />
          Zonas con más reportes
        </button>
      )}
    </div>
  );
}
