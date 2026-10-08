import { LAYERS, type LayerId } from '@/modules/map';
import { cn } from '@/utils/cn';

/** Botones para mostrar u ocultar cada capa del mapa. */
export function LayerChips({ layers, onToggle }: { layers: LayerId[]; onToggle: (id: LayerId) => void }) {
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
              'inline-flex h-10 shrink-0 items-center gap-2 rounded-full px-3.5 text-[15px] font-semibold shadow-[var(--shadow-card)] transition',
              on ? 'bg-ink text-white' : 'bg-surface text-muted',
            )}
          >
            <span className="size-2.5 rounded-full" style={{ background: on ? l.color : '#c9cdd3' }} aria-hidden />
            {l.label}
          </button>
        );
      })}
    </div>
  );
}
