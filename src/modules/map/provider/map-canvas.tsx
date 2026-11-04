'use client';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/primitives';
import type { MapCanvasProps } from './maplibre-canvas';

// Adaptador del proveedor de mapa: MapLibre + OpenFreeMap (ADR-022). Si algún día cambia el proveedor,
// se agrega aquí con la misma interfaz y ningún otro archivo cambia. Se carga sin SSR para que la primera pintura no espere al mapa (§6.1).
const MaplibreCanvas = dynamic(() => import('./maplibre-canvas'), {
  ssr: false,
  loading: () => <Skeleton className="absolute inset-0 rounded-none" />,
});

export type { MapCanvasProps };

export function MapCanvas(props: MapCanvasProps) {
  return <MaplibreCanvas {...props} />;
}
