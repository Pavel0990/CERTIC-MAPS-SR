'use client';
import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import { Skeleton } from '@/components/ui/primitives';
import type { MapCanvasProps } from './maplibre-canvas';

// Adaptador del proveedor de mapa: MapLibre + OpenFreeMap (ADR-022). Si algún día cambia el proveedor,
// se agrega aquí con la misma interfaz y ningún otro archivo cambia. Se carga sin SSR para que la primera pintura no espere al mapa (§6.1).
const MaplibreCanvas = dynamic(() => import('./maplibre-canvas'), {
  ssr: false,
  loading: () => <Skeleton className="absolute inset-0 rounded-none" />,
});

export type { MapCanvasProps };

/**
 * `lazy`: el motor de mapas (unos 300 KB de JS y las teselas) se descarga recién cuando el mapa está por
 * entrar en pantalla. Para los mapas pequeños de las fichas, que mucha gente no llega a ver (datos prepagados).
 */
export function MapCanvas({ lazy = false, ...props }: MapCanvasProps & { lazy?: boolean }) {
  const [visible, setVisible] = useState(!lazy);
  const placeholder = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = placeholder.current;
    if (visible || !el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        setVisible(true);
        io.disconnect();
      }
    }, { rootMargin: '300px' });
    io.observe(el);
    return () => io.disconnect();
  }, [visible]);
  if (!visible) {
    return (
      <div ref={placeholder} className={props.className ?? 'relative h-full w-full'} role="region" aria-label={props.ariaLabel}>
        <Skeleton className="absolute inset-0 rounded-none" />
      </div>
    );
  }
  return <MaplibreCanvas {...props} />;
}
