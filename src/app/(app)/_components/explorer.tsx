'use client';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, List, LocateFixed, Map as MapIcon, Navigation, Search, TriangleAlert, WifiOff, X } from 'lucide-react';
import {
  ALL_LAYERS, LAYERS, LAYER_BY_ID, MapCanvas, containsBBox, snapBBox,
  type BBox, type LatLng, type LayerId, type MapFeature, type MapFeatureCollection, type StaticLayers,
} from '@/modules/map';
import { isLiveStatus, useLiveTraffic } from '@/modules/traffic';
import { Button, IconButton } from '@/components/ui/button';
import { Badge } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { GEO_MESSAGE, useGeolocation } from '@/hooks/use-geolocation';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { PROVINCE_VIEW } from '@/config/env';
import { SEVERITY } from '@/lib/vocabulary';
import { cn } from '@/utils/cn';
import { directionsUrl, distanceKm, formatDistance } from '@/utils/format';

export interface ExplorerCatalogs {
  trafficTypes: Record<string, string>;
  categories: Record<string, string>;
}

interface SearchHit { layer: 'business' | 'tourism' | 'route'; id: string; name: string; municipality: string | null; point: LatLng | null }

const EMPTY: MapFeatureCollection = { type: 'FeatureCollection', features: [] };

export function Explorer({ catalogs, children, initialLayers = ALL_LAYERS }: { catalogs: ExplorerCatalogs; children?: React.ReactNode; initialLayers?: LayerId[] }) {
  const toast = useToast();
  const online = useOnlineStatus();
  const { state: geo, locate } = useGeolocation();
  const [layers, setLayers] = useState<LayerId[]>(initialLayers);
  const [data, setData] = useState<MapFeatureCollection>(EMPTY);
  const [staticLayers, setStaticLayers] = useState<StaticLayers | null>(null);
  const [selected, setSelected] = useState<MapFeature | null>(null);
  const [focus, setFocusState] = useState<{ center: LatLng; zoom?: number; key: number } | null>(null);
  // Cada foco lleva una clave nueva para que el mapa se mueva aunque se repita el mismo punto
  const setFocus = (f: { center: LatLng; zoom?: number; key: number }) => setFocusState((prev) => ({ ...f, key: (prev?.key ?? 0) + 1 }));
  const [degraded, setDegraded] = useState(false);
  const [live, setLive] = useState(false);
  const [view, setView] = useState<'map' | 'list'>('map');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ q: string; hits: SearchHit[] } | null>(null);
  const trimmed = query.trim();
  // Los resultados solo valen para la consulta actual (valor derivado, sin setState en efectos)
  const hits = trimmed.length >= 2 && results?.q === trimmed ? results.hits : null;
  const loaded = useRef<{ bbox: BBox; layers: string } | null>(null);
  const lastView = useRef<{ bbox: BBox; zoom: number } | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const userLocation = useMemo(() => (geo.status === 'ok' ? { lat: geo.lat, lng: geo.lng } : null), [geo]);

  // Capas estáticas (una vez por sesión)
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
      const fc = (await r.json()) as MapFeatureCollection;
      setData(fc);
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

  // Respaldo del tiempo real: si el canal no está conectado, refrescar el viewport cada 60 s (ADR-012)
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

  const visible = useMemo<MapFeatureCollection>(
    () => ({ type: 'FeatureCollection', features: data.features.filter((f) => layers.includes(f.properties.layer)) }),
    [data, layers],
  );

  const listItems = useMemo(() => {
    const items = [...visible.features];
    if (userLocation) {
      const d = (f: MapFeature) => distanceKm(userLocation, { lng: f.geometry.coordinates[0], lat: f.geometry.coordinates[1] });
      items.sort((a, b) => d(a) - d(b));
    }
    return items;
  }, [visible, userLocation]);

  function toggleLayer(id: LayerId) {
    setLayers((ls) => (ls.includes(id) ? ls.filter((l) => l !== id) : [...ls, id]));
  }

  async function onLocate() {
    const s = await locate();
    if (s.status === 'ok') setFocus({ center: { lat: s.lat, lng: s.lng }, zoom: 14.5, key: 0 });
    else if (s.status !== 'idle' && s.status !== 'locating') toast.show(GEO_MESSAGE[s.status], 'error');
  }

  // Búsqueda con espera corta entre teclas
  useEffect(() => {
    const q = trimmed;
    if (q.length < 2) return;
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/v1/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal })
        .then((r) => (r.ok ? r.json() : []))
        .then((hits: SearchHit[]) => setResults({ q, hits }))
        .catch(() => undefined);
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [trimmed]);

  function pickHit(h: SearchHit) {
    setQuery('');
    if (!layers.includes(h.layer)) setLayers((ls) => [...ls, h.layer]);
    if (h.point) {
      setFocus({ center: h.point, zoom: 15.5, key: 0 });
      setSelected({ type: 'Feature', geometry: { type: 'Point', coordinates: [h.point.lng, h.point.lat] }, properties: { id: h.id, layer: h.layer, title: h.name } });
      setView('map');
    }
  }

  function selectFromList(f: MapFeature) {
    setSelected(f);
    setView('map');
    setFocus({ center: { lng: f.geometry.coordinates[0], lat: f.geometry.coordinates[1] }, zoom: 15, key: 0 });
  }

  const mode = !online ? 'offline' : degraded ? 'degraded' : 'online';

  return (
    <div className="relative h-full min-h-[480px] w-full overflow-hidden">
      <MapCanvas
        className="absolute inset-0"
        features={visible}
        staticLayers={staticLayers}
        initialView={PROVINCE_VIEW}
        focus={focus}
        userLocation={userLocation}
        selectedId={selected?.properties.id}
        onMoveEnd={onMoveEnd}
        onSelect={setSelected}
        overlayInsets
      />

      {/* Panel superior: búsqueda y capas */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-col gap-2 p-3 md:left-3 md:right-auto md:top-3 md:w-[400px] md:p-0">
        <div className="pointer-events-auto relative">
          <label className="flex h-14 items-center gap-2 rounded-[18px] bg-surface pl-4 pr-2 shadow-[var(--shadow-float)]">
            <Search className="size-5 shrink-0 text-muted" aria-hidden />
            <span className="sr-only">Buscar lugares, negocios o rutas</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="¿A dónde quieres ir?"
              className="h-full min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-subtle"
              autoComplete="off"
              aria-controls="search-results"
            />
            {query && (
              <button type="button" aria-label="Borrar búsqueda" onClick={() => setQuery('')} className="rounded-full p-2 text-muted hover:bg-canvas">
                <X className="size-5" />
              </button>
            )}
            <Link
              href="/reportar"
              className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-[12px] bg-danger-soft px-3 text-[15px] font-semibold text-danger-strong hover:bg-[#fdd5d2]"
            >
              <TriangleAlert className="size-4" aria-hidden /> Reportar
            </Link>
          </label>
          {hits && (
            <div id="search-results" className="absolute inset-x-0 top-[calc(100%+6px)] max-h-[50dvh] overflow-y-auto rounded-[18px] bg-surface p-2 shadow-[var(--shadow-float)]">
              {hits.length === 0 ? (
                <p className="px-3 py-4 text-[15px] text-muted">No encontramos «{query}». Prueba con otra palabra, como «café» o «río».</p>
              ) : (
                <ul>
                  {hits.map((h) => {
                    const L = LAYER_BY_ID[h.layer];
                    return (
                      <li key={`${h.layer}-${h.id}`}>
                        <button type="button" onClick={() => pickHit(h)} className="flex w-full items-center gap-3 rounded-[12px] px-3 py-2.5 text-left hover:bg-canvas">
                          <LayerDot color={L.color} path={L.icon} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-semibold">{h.name}</span>
                            <span className="block text-sm text-muted">{L.label}{h.municipality ? ` · ${h.municipality}` : ''}</span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>
        <div className="pointer-events-auto -mx-3 flex gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:none] md:mx-0 md:flex-wrap md:px-0" role="group" aria-label="Capas del mapa">
          {LAYERS.map((l) => {
            const on = layers.includes(l.id);
            return (
              <button
                key={l.id}
                type="button"
                aria-pressed={on}
                onClick={() => toggleLayer(l.id)}
                className={cn(
                  'inline-flex h-10 shrink-0 items-center gap-2 rounded-full px-3.5 text-[15px] font-semibold shadow-[var(--shadow-card)] transition',
                  on ? 'bg-ink text-white' : 'bg-surface text-muted',
                )}
              >
                <span className="size-2.5 rounded-full" style={{ background: on ? l.color : '#c9cdd3' }} aria-hidden />
                {l.label}
              </button>
            );
          })}
        </div>
        {mode !== 'online' && (
          <div role="status" className="pointer-events-auto flex items-center gap-2 rounded-[14px] bg-warn-soft px-3.5 py-2.5 text-[15px] font-medium text-warn shadow-[var(--shadow-card)]">
            <WifiOff className="size-4 shrink-0" aria-hidden />
            {mode === 'offline'
              ? 'Sin conexión. Ves lo último que cargó; tus reportes se enviarán cuando vuelva la señal.'
              : 'Algunos datos no cargaron. Mostramos lo último disponible.'}
          </div>
        )}
      </div>

      {/* Controles laterales */}
      <div className="absolute bottom-[calc(var(--sheet-h,0px)+16px)] right-3 z-20 flex flex-col gap-2 md:bottom-6">
        <IconButton label={view === 'map' ? 'Ver como lista' : 'Ver mapa'} onClick={() => setView((v) => (v === 'map' ? 'list' : 'map'))}>
          {view === 'map' ? <List className="size-5" /> : <MapIcon className="size-5" />}
        </IconButton>
        <IconButton label="Mostrar mi ubicación" onClick={onLocate} disabled={geo.status === 'locating'}>
          <LocateFixed className={cn('size-5', geo.status === 'ok' && 'text-brand', geo.status === 'locating' && 'animate-pulse')} />
        </IconButton>
      </div>
      {live && (
        <p className="absolute bottom-3 left-3 z-10 hidden items-center gap-1.5 rounded-full bg-surface/90 px-3 py-1 text-[13px] font-semibold text-ok shadow-[var(--shadow-card)] md:inline-flex">
          <span className="relative flex size-2"><span className="absolute inset-0 animate-pulse-ring rounded-full bg-ok" /><span className="size-2 rounded-full bg-ok" /></span>
          Tránsito en vivo
        </p>
      )}

      {/* Lista accesible: todo lo del mapa tiene su equivalente en lista (§6.1) */}
      {view === 'list' && (
        <section aria-label="Lugares en esta zona" className="absolute inset-x-0 bottom-0 top-[124px] z-10 overflow-y-auto bg-canvas p-3 md:left-3 md:right-auto md:top-[132px] md:w-[400px] md:rounded-t-[18px] md:p-0">
          <p className="mb-2 px-1 text-sm font-semibold text-muted">{listItems.length} en esta zona{userLocation ? ', los más cercanos primero' : ''}</p>
          <ul className="flex flex-col gap-2">
            {listItems.map((f) => (
              <li key={f.properties.id}>
                <button type="button" onClick={() => selectFromList(f)} className="flex w-full items-center gap-3 rounded-[16px] bg-surface p-3 text-left shadow-[var(--shadow-card)] hover:bg-[#fafbfc]">
                  <LayerDot color={LAYER_BY_ID[f.properties.layer].color} path={LAYER_BY_ID[f.properties.layer].icon} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{f.properties.title}</span>
                    <span className="block text-sm text-muted">{subtitle(f, catalogs)}</span>
                  </span>
                  {userLocation && <span className="text-sm font-semibold text-muted">{formatDistance(distanceKm(userLocation, { lng: f.geometry.coordinates[0], lat: f.geometry.coordinates[1] }))}</span>}
                </button>
              </li>
            ))}
          </ul>
          {listItems.length === 0 && <p className="px-1 py-6 text-center text-muted">No hay nada en esta zona con las capas elegidas. Aleja el mapa o activa más capas.</p>}
        </section>
      )}

      {/* Ficha del punto elegido, o el contenido de la página (p. ej. "Descubre cerca de ti") */}
      <div className="absolute inset-x-0 bottom-0 z-30 md:bottom-4 md:left-3 md:right-auto md:w-[400px]">
        {selected ? (
          <SelectedCard feature={selected} catalogs={catalogs} userLocation={userLocation} onClose={() => setSelected(null)} />
        ) : (
          view === 'map' && children
        )}
      </div>
    </div>
  );
}

function subtitle(f: MapFeature, catalogs: ExplorerCatalogs) {
  const L = LAYER_BY_ID[f.properties.layer];
  if (f.properties.layer === 'traffic') return `${SEVERITY[f.properties.severity ?? 2]?.label ?? ''} · alerta vial`;
  const cat = f.properties.category ? catalogs.categories[f.properties.category] ?? '' : '';
  return [L.label, cat].filter(Boolean).join(' · ');
}

function LayerDot({ color, path }: { color: string; path: string }) {
  return (
    <span className="flex size-10 shrink-0 items-center justify-center rounded-full text-white" style={{ background: color }} aria-hidden>
      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
        <path d={path} />
      </svg>
    </span>
  );
}

function SelectedCard({ feature, catalogs, userLocation, onClose }: { feature: MapFeature; catalogs: ExplorerCatalogs; userLocation: LatLng | null; onClose: () => void }) {
  const p = feature.properties;
  const L = LAYER_BY_ID[p.layer];
  const [lng, lat] = feature.geometry.coordinates;
  const href = L.href(p.id);
  const dist = userLocation ? formatDistance(distanceKm(userLocation, { lat, lng })) : null;
  return (
    <article aria-label={p.title} className="m-3 animate-sheet-in rounded-[20px] bg-surface p-4 shadow-[var(--shadow-float)] md:m-0">
      <div className="flex items-start gap-3">
        <LayerDot color={L.color} path={L.icon} />
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold leading-tight">{p.title}</h2>
          <p className="mt-0.5 text-[15px] text-muted">
            {subtitle(feature, catalogs)}
            {dist ? ` · a ${dist}` : ''}
          </p>
        </div>
        <button type="button" onClick={onClose} aria-label="Cerrar ficha" className="-mr-1 -mt-1 flex size-10 items-center justify-center rounded-full hover:bg-canvas">
          <X className="size-5" />
        </button>
      </div>
      {p.layer === 'traffic' && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge tone={SEVERITY[p.severity ?? 2]?.tone ?? 'danger'}>Gravedad {SEVERITY[p.severity ?? 2]?.label.toLowerCase()}</Badge>
          <span className="text-sm text-muted">Alerta vial · sale sola del mapa cuando vence</span>
        </div>
      )}
      <div className="mt-4 flex gap-2">
        {href && (
          <Link href={href} className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-[14px] bg-ink px-4 font-semibold text-white hover:bg-black">
            Ver detalles <ArrowRight className="size-4" aria-hidden />
          </Link>
        )}
        <a
          href={directionsUrl(lat, lng)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-[14px] bg-brand-soft px-4 font-semibold text-brand-strong hover:bg-[#dce8ff]"
        >
          <Navigation className="size-4" aria-hidden /> Cómo llegar
        </a>
      </div>
      {p.layer === 'traffic' && (
        <Button variant="ghost" size="sm" className="mt-2 w-full text-muted" onClick={onClose}>
          Entendido
        </Button>
      )}
    </article>
  );
}
