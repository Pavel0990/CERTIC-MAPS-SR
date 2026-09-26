'use client';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/primitives';
import type { MapCanvasProps } from './maplibre-canvas';

// Adaptador del proveedor de mapa (ADR-004). Hoy: MapLibre + OpenFreeMap. Cuando se configure
// NEXT_PUBLIC_GOOGLE_MAPS_KEY se agrega aquí el proveedor de Google con la misma interfaz;
// ningún otro archivo cambia. Se carga sin SSR para que la primera pintura no espere al mapa (§6.1).
const MaplibreCanvas = dynamic(() => import('./maplibre-canvas'), {
  ssr: false,
  loading: () => <Skeleton className="absolute inset-0 rounded-none" />,
});

export type { MapCanvasProps };

export function MapCanvas(props: MapCanvasProps) {
  return <MaplibreCanvas {...props} />;
}
