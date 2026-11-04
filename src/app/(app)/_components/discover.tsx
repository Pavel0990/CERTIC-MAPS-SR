import Image from 'next/image';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { LAYER_BY_ID } from '@/modules/map';
import { Eyebrow } from '@/components/ui/primitives';
import { BottomSheet } from './explorer/bottom-sheet';

export interface DiscoverItem {
  id: string;
  layer: 'tourism' | 'route';
  title: string;
  subtitle: string;
  /** Foto aprobada de la ficha; sin foto, la tarjeta usa el color de la capa */
  image?: string;
}

/** Hoja "Descubre" de la pantalla de inicio (del prototipo): turismo y rutas publicadas. */
export function Discover({ items, alerts }: { items: DiscoverItem[]; alerts: number }) {
  return (
    <BottomSheet
      labelledBy="descubre"
      title={
        <>
          <Eyebrow>Santiago Rodríguez</Eyebrow>
          <h2 id="descubre" className="text-[22px] font-extrabold leading-tight">Descubre la provincia</h2>
        </>
      }
      aside={
        <Link prefetch={false} href="/mapa" className="-mr-2 hidden min-h-11 shrink-0 items-center whitespace-nowrap px-2 text-[15px] font-semibold text-brand hover:underline md:flex">
          Ver mapa <ChevronRight className="size-4" aria-hidden />
        </Link>
      }
    >
      {alerts > 0 && (
        <Link prefetch={false} href="/mapa?capas=traffic" className="mt-1 flex items-center gap-2 rounded-[14px] bg-danger-soft md:mt-3 px-3 py-2.5 text-[15px] font-semibold text-danger-strong">
          <span className="relative flex size-2.5"><span className="absolute inset-0 animate-pulse-ring rounded-full bg-danger" /><span className="size-2.5 rounded-full bg-danger" /></span>
          {alerts === 1 ? '1 alerta de tránsito activa' : `${alerts} alertas de tránsito activas`}
          <ChevronRight className="ml-auto size-4" aria-hidden />
        </Link>
      )}
      {/* Accesos en lista: para quien prefiere no usar el mapa */}
      <nav aria-label="Ver en lista" className="mt-3 grid first:mt-1 grid-cols-3 gap-2">
        {([['business', '/negocios', 'Negocios'], ['tourism', '/turismo', 'Lugares'], ['route', '/rutas', 'Rutas']] as const).map(([layer, href, label]) => {
          const L = LAYER_BY_ID[layer];
          return (
            <Link prefetch={false} key={href} href={href} className="flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-[14px] border border-line px-2 py-2 text-center text-[15px] font-semibold hover:bg-canvas">
              <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke={L.color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d={L.icon} />
              </svg>
              {label}
            </Link>
          );
        })}
      </nav>
      <ul className="-mx-4 mt-3 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        {items.map((it, i) => {
          const L = LAYER_BY_ID[it.layer];
          return (
            <li key={it.id} className="w-[200px] shrink-0 snap-start">
              <Link prefetch={false} href={L.href(it.id) ?? '#'} className="group block">
                <div className="relative h-[112px] overflow-hidden rounded-[16px]" style={{ background: `linear-gradient(135deg, ${L.color}, ${L.color}bb 60%, #0f172a)` }}>
                  {it.image ? (
                    // Foto decorativa: el nombre del lugar va debajo, como texto
                    <Image src={it.image} alt="" fill sizes="200px" priority={i === 0} className="object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
                  ) : (
                    <svg viewBox="0 0 24 24" className="absolute -bottom-3 -right-3 size-24 text-white/25" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d={L.icon} />
                    </svg>
                  )}
                  <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-0.5 text-[14px] font-bold text-ink">
                    <span className="size-2 rounded-full" style={{ background: L.color }} aria-hidden />
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
    </BottomSheet>
  );
}
