'use client';
import { useEffect, useState } from 'react';
import type { HotspotCollection } from '@/modules/map';

/**
 * Puntos calientes de los últimos 90 días, pedidos una sola vez (el CDN los guarda 10 minutos).
 * `undefined` mientras carga; `null` si la capa no está disponible (sin red o la base todavía no tiene la función).
 */
export function useHotspots() {
  const [data, setData] = useState<HotspotCollection | null | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    fetch('/api/v1/map/hotspots')
      .then((r) => (r.ok ? (r.json() as Promise<HotspotCollection>) : null))
      .then((d) => { if (alive) setData(d && Array.isArray(d.features) ? d : null); })
      .catch(() => { if (alive) setData(null); });
    return () => { alive = false; };
  }, []);
  return data;
}
