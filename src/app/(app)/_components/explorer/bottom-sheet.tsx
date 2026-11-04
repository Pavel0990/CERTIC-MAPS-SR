'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ChevronUp } from 'lucide-react';
import { cn } from '@/utils/cn';

const MOBILE = '(max-width: 767px)';
/** Un toque (o un arrastre de menos de esto) abre o cierra la hoja */
const TAP_PX = 8;

/**
 * Hoja inferior del mapa en el teléfono, como en las apps de mapas: empieza plegada (solo el título) para que se
 * vea el mapa, y se abre arrastrándola hacia arriba o tocando el título. En PC es una tarjeta fija sin arrastre.
 * Publica su altura en --sheet-h del mapa para que los botones flotantes queden siempre por encima.
 */
export function BottomSheet({ title, aside, children, labelledBy }: {
  /** Lo que se ve con la hoja plegada; también es el botón para abrirla */
  title: React.ReactNode;
  /** Junto al título, fuera del botón (p. ej. un enlace) */
  aside?: React.ReactNode;
  children: React.ReactNode;
  labelledBy: string;
}) {
  const sheet = useRef<HTMLElement>(null);
  const head = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const [mobile, setMobile] = useState(false);
  const [open, setOpen] = useState(false);
  const [sizes, setSizes] = useState({ peek: 0, full: 0 });
  // Altura mientras el dedo arrastra; null cuando la hoja está quieta en uno de sus dos puntos
  const [dragH, setDragH] = useState<number | null>(null);
  const dragged = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia(MOBILE);
    const sync = () => setMobile(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  // Plegada: asa + título. Abierta: todo el contenido, sin pasar del 85 % del mapa (el resto se desplaza)
  useLayoutEffect(() => {
    if (!mobile) return;
    const measure = () => {
      const area = sheet.current?.parentElement?.parentElement?.clientHeight ?? window.innerHeight;
      const peek = head.current?.offsetHeight ?? 64;
      const full = Math.min(peek + (content.current?.offsetHeight ?? 0) + 16, Math.round(area * 0.85));
      setSizes({ peek, full: Math.max(full, peek) });
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (head.current) ro.observe(head.current);
    if (content.current) ro.observe(content.current);
    window.addEventListener('resize', measure);
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); };
  }, [mobile]);

  const height = !mobile ? undefined : dragH ?? (open ? sizes.full : sizes.peek);

  useEffect(() => {
    const root = sheet.current?.closest<HTMLElement>('[data-explorer]');
    if (!root || height === undefined) return;
    root.style.setProperty('--sheet-h', `${height}px`);
    // Abierta, los botones flotantes del mapa se esconden: chocarían con el buscador
    root.dataset.sheet = height > sizes.peek + 120 ? 'open' : 'peek';
    return () => { root.style.removeProperty('--sheet-h'); delete root.dataset.sheet; };
  }, [height, sizes.peek]);

  // El arrastre se sigue en toda la ventana: el dedo (o el ratón) sale enseguida del título al subir la hoja
  function onPointerDown(e: React.PointerEvent) {
    if (!mobile || height === undefined || e.button !== 0) return;
    const startY = e.clientY;
    const startH = height;
    let moved = false;
    let last = startH;
    const move = (ev: PointerEvent) => {
      const dy = startY - ev.clientY;
      if (!moved && Math.abs(dy) <= TAP_PX) return;
      moved = true;
      last = Math.min(sizes.full, Math.max(sizes.peek, startH + dy));
      setDragH(last);
    };
    const end = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
      if (!moved) return; // fue un toque: lo maneja el clic del botón
      // Tras arrastrar, el navegador puede mandar un clic al soltar: no debe volver a abrir o cerrar la hoja
      dragged.current = true;
      window.setTimeout(() => { dragged.current = false; }, 0);
      // Se queda abierta o plegada según hacia dónde se soltó: basta con pasar un tercio del recorrido
      const third = (sizes.full - sizes.peek) / 3;
      setOpen(ev.clientY < startY ? last > sizes.peek + third : last > sizes.full - third);
      setDragH(null);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
  }

  return (
    <section
      ref={sheet}
      aria-labelledby={labelledBy}
      style={height === undefined ? undefined : { height }}
      className={cn(
        'flex flex-col overflow-hidden bg-surface shadow-[var(--shadow-float)]',
        'rounded-t-[22px] md:rounded-[22px]',
        dragH === null && 'transition-[height] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none',
      )}
    >
      <div
        ref={head}
        className="shrink-0 touch-none select-none px-4 pt-2 md:touch-auto md:select-auto md:pt-4"
        onPointerDown={onPointerDown}
      >
        <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-line-strong md:hidden" aria-hidden />
        <div className="flex items-center justify-between gap-2 pb-2 md:pb-0">
          {mobile ? (
            <button type="button" aria-expanded={open} onClick={() => !dragged.current && setOpen((o) => !o)} className="flex min-h-11 min-w-0 flex-1 items-center gap-2 text-left">
              <span className="min-w-0 flex-1">{title}</span>
              <ChevronUp className={cn('size-5 shrink-0 text-muted transition-transform duration-300', open && 'rotate-180')} aria-hidden />
              <span className="sr-only">{open ? 'Plegar' : 'Ver más'}</span>
            </button>
          ) : (
            <div className="min-w-0 flex-1">{title}</div>
          )}
          {aside}
        </div>
      </div>
      {/* Plegada, el contenido no se puede enfocar con el teclado ni lo lee el lector de pantalla */}
      <div ref={body} inert={mobile && !open && dragH === null} className={cn('min-h-0 flex-1 px-4 pb-4', mobile ? 'overflow-y-auto overscroll-contain' : '')}>
        <div ref={content}>{children}</div>
      </div>
    </section>
  );
}
