'use client';
import { useState, type ReactNode } from 'react';
import { LocateFixed } from 'lucide-react';
import { MapCanvas, type LatLng, type StaticLayers } from '@/modules/map';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { GEO_MESSAGE, useGeolocation } from '@/hooks/use-geolocation';
import { PROVINCE_VIEW } from '@/config/env';

/** Mapa con el pin fijo al centro para marcar un punto (mismo patrón que /reportar). */
export function LocationPicker({
  onChange, ariaLabel, staticLayers, initial, flyTo, children,
}: {
  onChange: (p: LatLng) => void;
  ariaLabel: string;
  staticLayers?: StaticLayers | null;
  initial?: LatLng | null;
  /** Mover el mapa desde fuera (p. ej. al cargar un GPX). Cambia `key` para repetir. */
  flyTo?: { center: LatLng; zoom: number; key: number } | null;
  children?: ReactNode;
}) {
  const toast = useToast();
  const { state: geo, locate } = useGeolocation();
  const [focus, setFocus] = useState<{ center: LatLng; zoom?: number; key: number } | null>(initial ? { center: initial, zoom: 15, key: 0 } : null);
  const [lastFly, setLastFly] = useState<number | null>(null);
  // Ajustar el estado durante el render (patrón de React para derivar de una prop) en vez de un efecto
  if (flyTo && flyTo.key !== lastFly) {
    setLastFly(flyTo.key);
    setFocus((f) => ({ center: flyTo.center, zoom: flyTo.zoom, key: (f?.key ?? 0) + 1 }));
  }

  async function useMyLocation() {
    const s = await locate();
    if (s.status === 'ok') {
      setFocus((f) => ({ center: { lat: s.lat, lng: s.lng }, zoom: 17, key: (f?.key ?? 0) + 1 }));
      onChange({ lat: s.lat, lng: s.lng });
    } else if (s.status !== 'idle' && s.status !== 'locating') toast.show(GEO_MESSAGE[s.status], 'error');
  }

  return (
    <>
      <div className="relative mt-4 h-[52dvh] min-h-[320px] overflow-hidden rounded-[20px] shadow-[var(--shadow-card)]">
        <MapCanvas
          className="absolute inset-0"
          centerPin
          initialView={PROVINCE_VIEW}
          focus={focus}
          staticLayers={staticLayers}
          userLocation={geo.status === 'ok' ? { lat: geo.lat, lng: geo.lng } : null}
          onMoveEnd={(v) => onChange(v.center)}
          ariaLabel={ariaLabel}
        />
      </div>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Button variant="soft" size="lg" className="flex-1" icon={<LocateFixed className="size-5" />} onClick={useMyLocation} loading={geo.status === 'locating'}>
          Usar mi ubicación actual
        </Button>
        {children}
      </div>
      {geo.status === 'ok' && geo.accuracy > 60 && (
        <p className="mt-2 text-sm text-muted">Tu ubicación tiene un margen de unos {Math.round(geo.accuracy)} m: ajusta el pin si hace falta.</p>
      )}
    </>
  );
}
