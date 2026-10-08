'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ALL_LAYERS, containsBBox, snapBBox, type BBox, type MapFeature, type MapFeatureCollection, type StaticLayers } from '@/modules/map';
import { isLiveStatus, useLiveTraffic } from '@/modules/traffic';
import { useToast } from '@/components/ui/toast';
import type { ExplorerCatalogs } from './shared';

const EMPTY: MapFeatureCollection = { type: 'FeatureCollection', features: [] };

/**
 * Datos del mapa: capas estáticas (una vez por sesión), puntos del área visible (con espera corta al
 * mover el mapa y sin repetir pedidos dentro del área ya cargada) y alertas de tránsito en vivo.
 * Si el canal en vivo no conecta, refresca el área cada 60 s (ADR-012).
 */
export function useMapData(catalogs: ExplorerCatalogs) {
  const toast = useToast();
  const [data, setData] = useState<MapFeatureCollection>(EMPTY);
  const [staticLayers, setStaticLayers] = useState<StaticLayers | null>(null);
  const [degraded, setDegraded] = useState(false);
  const [live, setLive] = useState(false);
  const loaded = useRef<{ bbox: BBox; layers: string } | null>(null);
  const lastView = useRef<{ bbox: BBox; zoom: number } | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    fetch('/api/v1/map/static-layers')
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(setStaticLayers)
      .catch(() => setDegraded(true));
  }, []);

  const load = useCallback(async (bbox: BBox, force = false) => {
    const snapped = snapBBox(bbox);
    const key = [...ALL_LAYERS].join(',');
    if (!force && loaded.current && loaded.current.layers === key && containsBBox(loaded.current.bbox, snapped)) return;
    const qs = `bbox=${snapped.minLng},${snapped.minLat},${snapped.maxLng},${snapped.maxLat}&layers=${key}`;
    try {
      const r = await fetch(`/api/v1/map/features?${qs}`);
      if (!r.ok) throw new Error(String(r.status));
      setData((await r.json()) as MapFeatureCollection);
      loaded.current = { bbox: snapped, layers: key };
      setDegraded(false);
    } catch {
      setDegraded(true);
    }
  }, []);

  const onMoveEnd = useCallback(
    (v: { bbox: BBox; zoom: number }) => {
      lastView.current = v;
      clearTimeout(debounce.current);
      debounce.current = setTimeout(() => void load(v.bbox), 300);
    },
    [load],
  );

  useEffect(() => {
    if (live) return;
    const t = setInterval(() => lastView.current && void load(lastView.current.bbox, true), 60_000);
    return () => clearInterval(t);
  }, [live, load]);

  useLiveTraffic(
    staticLayers?.provinceId ?? null,
    (e) => {
      setData((fc) => {
        const rest = fc.features.filter((f) => f.properties.id !== e.id);
        if (!isLiveStatus(e.status)) return { ...fc, features: rest };
        const feature: MapFeature = {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [e.lng, e.lat] },
          properties: { id: e.id, layer: 'traffic', title: catalogs.trafficTypes[e.type] ?? 'Alerta vial', category: e.type, severity: e.severity },
        };
        return { ...fc, features: [...rest, feature] };
      });
      if (isLiveStatus(e.status)) toast.show(`Nueva alerta: ${catalogs.trafficTypes[e.type] ?? 'tránsito'}`, 'info');
    },
    setLive,
  );

  return { data, staticLayers, degraded, live, onMoveEnd };
}
