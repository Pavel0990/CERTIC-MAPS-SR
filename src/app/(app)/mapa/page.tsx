import type { Metadata } from 'next';
import { Explorer } from '../_components/explorer';
import { ALL_LAYERS, type LayerId } from '@/modules/map';
import { getLabelMaps } from '@/lib/catalogs';

export const metadata: Metadata = { title: 'Mapa' };

// ?cerca=lat,lng abre el mapa de cerca en ese punto (p. ej. "Ver el reporte" del aviso de reporte parecido en /reportar)
function nearView(cerca?: string) {
  const m = /^(-?\d{1,2}(?:\.\d{1,6})?),(-?\d{1,3}(?:\.\d{1,6})?)$/.exec(cerca ?? '');
  if (!m) return undefined;
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return undefined;
  return { center: { lat, lng }, zoom: 17 };
}

export default async function MapPage({ searchParams }: { searchParams: Promise<{ capas?: string; cerca?: string }> }) {
  const { capas, cerca } = await searchParams;
  const requested = (capas ?? '').split(',').filter((c): c is LayerId => (ALL_LAYERS as string[]).includes(c));
  const labels = await getLabelMaps();
  return (
    <div className="h-[calc(100dvh-68px-env(safe-area-inset-bottom))] md:h-dvh">
      <h1 className="sr-only">Mapa de Santiago Rodríguez</h1>
      <Explorer catalogs={labels} initialLayers={requested.length ? requested : ALL_LAYERS} initialView={nearView(cerca)} />
    </div>
  );
}
