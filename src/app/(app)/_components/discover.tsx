import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { LAYER_BY_ID } from '@/modules/map';
import { Eyebrow } from '@/components/ui/primitives';

export interface DiscoverItem {
  id: string;
  layer: 'tourism' | 'route';
  title: string;
  subtitle: string;
}

/** Hoja "Descubre" de la pantalla de inicio (del prototipo): turismo y rutas publicadas. */
export function Discover({ items, alerts }: { items: DiscoverItem[]; alerts: number }) {
  return (
    <section aria-labelledby="descubre" className="m-3 rounded-[22px] bg-surface p-4 shadow-[var(--shadow-float)] md:m-0">
      <div className="mx-auto -mt-1 mb-3 h-1.5 w-10 rounded-full bg-line-strong md:hidden" aria-hidden />
      <div className="flex items-end justify-between gap-2">
        <div>
          <Eyebrow>Santiago Rodríguez</Eyebrow>
          <h2 id="descubre" className="text-xl font-bold">Descubre la provincia</h2>
        </div>
        <Link href="/mapa" className="flex items-center text-[15px] font-semibold text-brand hover:underline">
          Ver mapa <ChevronRight className="size-4" aria-hidden />
        </Link>
      </div>
      {alerts > 0 && (
        <Link href="/mapa?capas=traffic" className="mt-3 flex items-center gap-2 rounded-[14px] bg-danger-soft px-3 py-2.5 text-[15px] font-semibold text-danger-strong">
          <span className="relative flex size-2.5"><span className="absolute inset-0 animate-pulse-ring rounded-full bg-danger" /><span className="size-2.5 rounded-full bg-danger" /></span>
          {alerts === 1 ? '1 alerta de tránsito activa' : `${alerts} alertas de tránsito activas`}
          <ChevronRight className="ml-auto size-4" aria-hidden />
        </Link>
      )}
      {/* Accesos en lista: para quien prefiere no usar el mapa */}
      <nav aria-label="Ver en lista" className="mt-3 grid grid-cols-3 gap-2">
        {([['business', '/negocios', 'Negocios'], ['tourism', '/turismo', 'Lugares'], ['route', '/rutas', 'Rutas']] as const).map(([layer, href, label]) => {
          const L = LAYER_BY_ID[layer];
          return (
            <Link key={href} href={href} className="flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-[14px] border border-line px-2 py-2 text-center text-[15px] font-semibold hover:bg-canvas">
              <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke={L.color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d={L.icon} />
              </svg>
              {label}
            </Link>
          );
        })}
      </nav>
      <ul className="-mx-4 mt-3 flex snap-x gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        {items.map((it) => {
          const L = LAYER_BY_ID[it.layer];
          return (
            <li key={it.id} className="w-[200px] shrink-0 snap-start">
              <Link href={L.href(it.id) ?? '#'} className="group block">
                <div className="relative h-[112px] overflow-hidden rounded-[16px]" style={{ background: `linear-gradient(135deg, ${L.color}, ${L.color}bb 60%, #0f172a)` }}>
                  <svg viewBox="0 0 24 24" className="absolute -bottom-3 -right-3 size-24 text-white/25" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d={L.icon} />
                  </svg>
                  <span className="absolute left-2.5 top-2.5 rounded-full bg-white px-2 py-0.5 text-[12px] font-bold" style={{ color: L.color }}>
                    {L.label}
                  </span>
                </div>
                <p className="mt-2 truncate font-semibold group-hover:underline">{it.title}</p>
                <p className="truncate text-sm text-muted">{it.subtitle}</p>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
