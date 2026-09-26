'use client';
import { useEffect, useEffectEvent, useRef } from 'react';
import { Map as MLMap, Marker, NavigationControl, setWorkerUrl, type GeoJSONSource, type MapLayerMouseEvent, type MapMouseEvent } from 'maplibre-gl';
import maplibrePkg from 'maplibre-gl/package.json';
import 'maplibre-gl/dist/maplibre-gl.css';
import { ICON_PATHS, LAYERS } from '../layers';
import type { BBox, LatLng, MapFeature, MapFeatureCollection, StaticLayers } from '../types';

// Proveedor MapLibre GL + OpenFreeMap (datos © OpenStreetMap). Es el plan B de ADR-004 y el proveedor
// activo mientras no se configure la clave de Google Maps. El resto de la app no conoce esta librería.
const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';
// El worker se sirve desde public/vendor (scripts/copy-vendor.mjs), con la versión instalada.
setWorkerUrl(`/vendor/maplibre/${maplibrePkg.version}/maplibre-gl-worker.mjs`);

export interface MapCanvasProps {
  features?: MapFeatureCollection;
  staticLayers?: StaticLayers | null;
  initialView: { center: LatLng; zoom: number; bounds?: BBox };
  focus?: { center: LatLng; zoom?: number; key: string | number } | null;
  userLocation?: LatLng | null;
  selectedId?: string | null;
  /** Modo "elegir un punto": el pin fijo al centro marca la ubicación (reportar, proponer). */
  centerPin?: boolean;
  onMoveEnd?: (view: { bbox: BBox; zoom: number; center: LatLng }) => void;
  onSelect?: (feature: MapFeature | null) => void;
  interactive?: boolean;
  className?: string;
  ariaLabel?: string;
}

const EMPTY: MapFeatureCollection = { type: 'FeatureCollection', features: [] };

function markerSvg(color: string, path: string, size = 44) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 44 44">
    <circle cx="22" cy="22" r="19" fill="${color}" stroke="#fff" stroke-width="3"/>
    <g transform="translate(12 12) scale(0.8333)" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="${path}"/></g>
  </svg>`;
}

function loadImage(svg: string, px: number) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image(px, px);
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
}

export default function MaplibreCanvas({
  features = EMPTY,
  staticLayers,
  initialView,
  focus,
  userLocation,
  selectedId,
  centerPin,
  onMoveEnd,
  onSelect,
  interactive = true,
  className,
  ariaLabel = 'Mapa de Santiago Rodríguez',
}: MapCanvasProps) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const ready = useRef(false);
  const userMarker = useRef<Marker | null>(null);
  // Callbacks y datos más recientes, leídos desde los eventos del mapa sin recrearlo
  const emitMove = useEffectEvent((v: Parameters<NonNullable<MapCanvasProps['onMoveEnd']>>[0]) => onMoveEnd?.(v));
  const emitSelect = useEffectEvent((id: string | null) => onSelect?.(id ? features.features.find((x) => x.properties.id === id) ?? null : null));
  const current = useEffectEvent(() => ({ features, staticLayers, selectedId }));

  // Crear el mapa una sola vez
  useEffect(() => {
    if (!container.current) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const small = window.matchMedia('(max-width: 767px)').matches;
    const b = initialView.bounds;
    const map = new MLMap({
      container: container.current,
      style: STYLE_URL,
      center: [initialView.center.lng, initialView.center.lat],
      zoom: initialView.zoom,
      // Encuadrar la provincia completa; en móvil se deja espacio para la hoja inferior y la búsqueda
      ...(b ? { bounds: [[b.minLng, b.minLat], [b.maxLng, b.maxLat]] as [[number, number], [number, number]], fitBoundsOptions: { padding: small ? { top: 150, bottom: 320, left: 16, right: 16 } : { top: 60, bottom: 60, left: 440, right: 60 } } } : {}),
      minZoom: 7,
      maxZoom: 18,
      interactive,
      attributionControl: { compact: true },
      fadeDuration: reduceMotion ? 0 : 300,
    });
    mapRef.current = map;
    // En móvil se hace zoom con los dedos; los botones quedarían bajo la búsqueda
    if (interactive && !small) map.addControl(new NavigationControl({ showCompass: false }), 'top-right');

    const emitView = () => {
      const b = map.getBounds();
      const c = map.getCenter();
      emitMove({
        bbox: { minLng: b.getWest(), minLat: b.getSouth(), maxLng: b.getEast(), maxLat: b.getNorth() },
        zoom: map.getZoom(),
        center: { lat: c.lat, lng: c.lng },
      });
    };

    map.on('load', async () => {
      // Íconos de los marcadores (uno por capa, en alta resolución)
      await Promise.all(
        LAYERS.map(async (l) => {
          const img = await loadImage(markerSvg(l.color, ICON_PATHS[l.id], 88), 88);
          if (!map.hasImage(`pin-${l.id}`)) map.addImage(`pin-${l.id}`, img, { pixelRatio: 2 });
        }),
      );

      map.addSource('municipalities', { type: 'geojson', data: current().staticLayers?.municipalities ?? { type: 'FeatureCollection', features: [] } });
      map.addLayer({ id: 'muni-fill', type: 'fill', source: 'municipalities', paint: { 'fill-color': '#2f6feb', 'fill-opacity': 0.03 } });
      map.addLayer({ id: 'muni-line', type: 'line', source: 'municipalities', paint: { 'line-color': '#2f6feb', 'line-width': 1.6, 'line-opacity': 0.55, 'line-dasharray': [3, 2] } });

      map.addSource('routes', { type: 'geojson', data: current().staticLayers?.routes ?? { type: 'FeatureCollection', features: [] } });
      map.addLayer({ id: 'route-casing', type: 'line', source: 'routes', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#ffffff', 'line-width': 7 } });
      map.addLayer({ id: 'route-line', type: 'line', source: 'routes', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#0e9f9a', 'line-width': 4 } });

      map.addSource('points', { type: 'geojson', data: current().features, cluster: true, clusterRadius: 46, clusterMaxZoom: 15 });
      map.addLayer({
        id: 'clusters', type: 'circle', source: 'points', filter: ['has', 'point_count'],
        paint: {
          'circle-color': '#ffffff', 'circle-stroke-color': '#2f6feb', 'circle-stroke-width': 3,
          'circle-radius': ['step', ['get', 'point_count'], 18, 10, 22, 50, 28],
        },
      });
      map.addLayer({
        id: 'cluster-count', type: 'symbol', source: 'points', filter: ['has', 'point_count'],
        layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-size': 15, 'text-font': ['Noto Sans Bold'] },
        paint: { 'text-color': '#1d4ed8' },
      });
      map.addLayer({
        id: 'traffic-halo', type: 'circle', source: 'points',
        filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'layer'], 'traffic']],
        paint: { 'circle-color': '#e5484d', 'circle-opacity': 0.18, 'circle-radius': 26 },
      });
      map.addLayer({
        id: 'pins', type: 'symbol', source: 'points', filter: ['!', ['has', 'point_count']],
        layout: {
          'icon-image': ['concat', 'pin-', ['get', 'layer']],
          'icon-size': ['case', ['==', ['get', 'id'], current().selectedId ?? ''], 1.25, 1],
          'icon-allow-overlap': true,
          'symbol-sort-key': ['match', ['get', 'layer'], 'traffic', 0, 'request', 1, 2],
        },
      });

      map.on('click', 'clusters', async (e: MapLayerMouseEvent) => {
        const f = e.features?.[0];
        if (!f) return;
        const src = map.getSource('points') as GeoJSONSource;
        const zoom = await src.getClusterExpansionZoom(f.properties?.cluster_id as number);
        map.easeTo({ center: (f.geometry as unknown as { coordinates: [number, number] }).coordinates, zoom });
      });
      map.on('click', 'pins', (e: MapLayerMouseEvent) => {
        const f = e.features?.[0];
        if (!f) return;
        emitSelect((f.properties?.id as string | undefined) ?? null);
      });
      map.on('click', (e: MapMouseEvent) => {
        const hit = map.queryRenderedFeatures(e.point, { layers: ['pins', 'clusters'] });
        if (!hit.length) emitSelect(null);
      });
      for (const layer of ['pins', 'clusters']) {
        map.on('mouseenter', layer, () => { map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', layer, () => { map.getCanvas().style.cursor = ''; });
      }
      ready.current = true;
      emitView();
    });
    map.on('moveend', emitView);

    return () => {
      ready.current = false;
      map.remove();
      mapRef.current = null;
    };
    // El mapa se crea una vez; los cambios de datos se aplican en los efectos siguientes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Datos de puntos
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready.current) return;
    (map.getSource('points') as GeoJSONSource | undefined)?.setData(features);
  }, [features]);

  // Capas estáticas (municipios y rutas)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready.current || !staticLayers) return;
    (map.getSource('municipalities') as GeoJSONSource | undefined)?.setData(staticLayers.municipalities);
    (map.getSource('routes') as GeoJSONSource | undefined)?.setData(staticLayers.routes);
  }, [staticLayers]);

  // Resaltar el seleccionado
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready.current || !map.getLayer('pins')) return;
    map.setLayoutProperty('pins', 'icon-size', ['case', ['==', ['get', 'id'], selectedId ?? ''], 1.25, 1]);
  }, [selectedId]);

  // Mover la cámara a un foco
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focus) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    map.easeTo({ center: [focus.center.lng, focus.center.lat], zoom: focus.zoom ?? Math.max(map.getZoom(), 14), duration: reduce ? 0 : 700 });
  }, [focus]);

  // Punto azul de "tu ubicación"
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!userLocation) {
      userMarker.current?.remove();
      userMarker.current = null;
      return;
    }
    if (!userMarker.current) {
      const el = document.createElement('div');
      el.setAttribute('aria-label', 'Tu ubicación');
      el.className = 'relative size-5';
      el.innerHTML =
        '<span class="absolute inset-0 rounded-full bg-[#2f6feb]/40 animate-pulse-ring"></span><span class="absolute inset-0 rounded-full border-[3px] border-white bg-[#2f6feb] shadow"></span>';
      userMarker.current = new Marker({ element: el });
    }
    userMarker.current.setLngLat([userLocation.lng, userLocation.lat]).addTo(map);
  }, [userLocation]);

  return (
    <div className={className ?? 'relative h-full w-full'}>
      <div ref={container} role="region" aria-label={ariaLabel} className="h-full w-full" />
      {centerPin && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-full" aria-hidden>
          <svg width="44" height="56" viewBox="0 0 44 56">
            <path d="M22 54s18-18.5 18-32A18 18 0 0 0 4 22c0 13.5 18 32 18 32z" fill="#e5484d" stroke="#fff" strokeWidth="3" />
            <circle cx="22" cy="22" r="7" fill="#fff" />
          </svg>
          <span className="absolute left-1/2 top-full h-1.5 w-4 -translate-x-1/2 rounded-full bg-ink/25 blur-[1px]" />
        </div>
      )}
    </div>
  );
}
