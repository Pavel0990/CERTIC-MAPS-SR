'use client';
import { useEffect } from 'react';
import { MapPin } from 'lucide-react';
import { TrackedLink } from '@/components/shared/engagement';
import { useGeolocation } from '@/hooks/use-geolocation';
import { distanceKm, formatDistance, wazeUrl } from '@/utils/format';

type Entity = 'business' | 'tourism_place' | 'eco_route';

const link = 'press inline-flex min-h-11 items-center gap-1.5 font-semibold text-brand hover:underline';

/**
 * Debajo de "Cómo llegar": a qué distancia está la persona y la opción de abrir Waze.
 * La ubicación se pide solo al tocar el botón, salvo que el navegador ya tenga el permiso (§10.10).
 */
export function DirectionsExtras({ entity, id, point }: { entity: Entity; id: string; point: { lat: number; lng: number } }) {
  const { state, locate } = useGeolocation();

  useEffect(() => {
    navigator.permissions?.query({ name: 'geolocation' }).then((p) => { if (p.state === 'granted') locate(); }).catch(() => {});
  }, [locate]);

  return (
    <p className="flex flex-wrap items-center justify-center gap-x-4 text-[15px] sm:justify-start">
      {state.status === 'ok' ? (
        <span className="inline-flex min-h-11 items-center gap-1.5 text-muted">
          <MapPin className="size-4" aria-hidden /> A {formatDistance(distanceKm(state, point))} de ti en línea recta
        </span>
      ) : state.status === 'idle' || state.status === 'locating' ? (
        <button type="button" onClick={locate} disabled={state.status === 'locating'} className={link}>
          <MapPin className="size-4" aria-hidden /> {state.status === 'locating' ? 'Buscando tu ubicación…' : '¿A qué distancia estoy?'}
        </button>
      ) : null}
      <TrackedLink entity={entity} id={id} metric="directions" href={wazeUrl(point.lat, point.lng)} className={link}>
        Abrir en Waze
      </TrackedLink>
    </p>
  );
}
