'use client';
import { useCallback, useState } from 'react';

export type GeoState =
  | { status: 'idle' }
  | { status: 'locating' }
  | { status: 'ok'; lat: number; lng: number; accuracy: number }
  | { status: 'denied' | 'unavailable' | 'timeout' };

/**
 * Ubicación puntual, pedida solo cuando la persona toca un botón (privacidad por defecto, §10.10).
 * Nunca se rastrea en segundo plano.
 */
export function useGeolocation() {
  const [state, setState] = useState<GeoState>({ status: 'idle' });
  const locate = useCallback(() => {
    return new Promise<GeoState>((resolve) => {
      if (!('geolocation' in navigator)) {
        const s: GeoState = { status: 'unavailable' };
        setState(s);
        return resolve(s);
      }
      setState({ status: 'locating' });
      navigator.geolocation.getCurrentPosition(
        (p) => {
          const s: GeoState = { status: 'ok', lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy };
          setState(s);
          resolve(s);
        },
        (err) => {
          const s: GeoState = { status: err.code === err.PERMISSION_DENIED ? 'denied' : err.code === err.TIMEOUT ? 'timeout' : 'unavailable' };
          setState(s);
          resolve(s);
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
      );
    });
  }, []);
  return { state, locate };
}

export const GEO_MESSAGE: Record<'denied' | 'unavailable' | 'timeout', string> = {
  denied: 'No tenemos permiso para ver tu ubicación. Puedes activarlo en tu navegador o marcar el punto en el mapa.',
  unavailable: 'No pudimos saber dónde estás. Marca el punto en el mapa.',
  timeout: 'Tardó mucho en encontrar tu ubicación. Inténtalo otra vez o marca el punto en el mapa.',
};
