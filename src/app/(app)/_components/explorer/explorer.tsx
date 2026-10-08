'use client';
import { useMemo, useState } from 'react';
import { List, LocateFixed, Map as MapIcon, WifiOff } from 'lucide-react';
import { ALL_LAYERS, MapCanvas, type LatLng, type LayerId, type MapFeature, type MapFeatureCollection } from '@/modules/map';
import { IconButton } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { GEO_MESSAGE, useGeolocation } from '@/hooks/use-geolocation';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { PROVINCE_VIEW } from '@/config/env';
import { cn } from '@/utils/cn';
import { FeatureList, byDistance } from './feature-list';
import { LayerChips } from './layer-chips';
import { SearchBox, type SearchHit } from './search-box';
import { SelectedCard } from './selected-card';
import type { ExplorerCatalogs } from './shared';
import { useMapData } from './use-map-data';

export type { ExplorerCatalogs } from './shared';

/** Mapa principal: búsqueda, capas, vista de lista, ficha del punto elegido y modos de conexión (§6.4). */
export function Explorer({ catalogs, children, initialLayers = ALL_LAYERS }: { catalogs: ExplorerCatalogs; children?: React.ReactNode; initialLayers?: LayerId[] }) {
  const toast = useToast();
  const online = useOnlineStatus();
  const { state: geo, locate } = useGeolocation();
  const { data, staticLayers, degraded, live, onMoveEnd } = useMapData(catalogs);
  const [layers, setLayers] = useState<LayerId[]>(initialLayers);
  const [selected, setSelected] = useState<MapFeature | null>(null);
  const [view, setView] = useState<'map' | 'list'>('map');
  const [focus, setFocus] = useState<{ center: LatLng; zoom?: number; key: number } | null>(null);
  // Cada foco lleva una clave nueva para que el mapa se mueva aunque se repita el mismo punto
  const focusOn = (center: LatLng, zoom: number) => setFocus((prev) => ({ center, zoom, key: (prev?.key ?? 0) + 1 }));

  const userLocation = useMemo(() => (geo.status === 'ok' ? { lat: geo.lat, lng: geo.lng } : null), [geo]);
  const visible = useMemo<MapFeatureCollection>(
    () => ({ type: 'FeatureCollection', features: data.features.filter((f) => layers.includes(f.properties.layer)) }),
    [data, layers],
  );
  const listItems = useMemo(() => byDistance(visible.features, userLocation), [visible, userLocation]);
  const mode = !online ? 'offline' : degraded ? 'degraded' : 'online';

  function toggleLayer(id: LayerId) {
    setLayers((ls) => (ls.includes(id) ? ls.filter((l) => l !== id) : [...ls, id]));
  }

  async function onLocate() {
    const s = await locate();
    if (s.status === 'ok') focusOn({ lat: s.lat, lng: s.lng }, 14.5);
    else if (s.status !== 'idle' && s.status !== 'locating') toast.show(GEO_MESSAGE[s.status], 'error');
  }

  function pickHit(h: SearchHit) {
    if (!layers.includes(h.layer)) setLayers((ls) => [...ls, h.layer]);
    if (!h.point) return;
    focusOn(h.point, 15.5);
    setSelected({ type: 'Feature', geometry: { type: 'Point', coordinates: [h.point.lng, h.point.lat] }, properties: { id: h.id, layer: h.layer, title: h.name } });
    setView('map');
  }

  function selectFromList(f: MapFeature) {
    setSelected(f);
    setView('map');
    focusOn({ lng: f.geometry.coordinates[0], lat: f.geometry.coordinates[1] }, 15);
  }

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

      {/* Panel superior: búsqueda, capas y aviso de conexión */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-col gap-2 p-3 md:left-3 md:right-auto md:top-3 md:w-[400px] md:p-0">
        <SearchBox onPick={pickHit} />
        <LayerChips layers={layers} onToggle={toggleLayer} />
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

      {view === 'list' && <FeatureList items={listItems} catalogs={catalogs} userLocation={userLocation} onSelect={selectFromList} />}

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
