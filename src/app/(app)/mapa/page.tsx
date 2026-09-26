import type { Metadata } from 'next';
import { Explorer } from '../_components/explorer';
import { ALL_LAYERS, type LayerId } from '@/modules/map';
import { getLabelMaps } from '@/lib/catalogs';

export const metadata: Metadata = { title: 'Mapa' };

export default async function MapPage({ searchParams }: { searchParams: Promise<{ capas?: string }> }) {
  const { capas } = await searchParams;
  const requested = (capas ?? '').split(',').filter((c): c is LayerId => (ALL_LAYERS as string[]).includes(c));
  const labels = await getLabelMaps();
  return (
    <div className="h-[calc(100dvh-68px-env(safe-area-inset-bottom))] md:h-dvh">
      <h1 className="sr-only">Mapa de Santiago Rodríguez</h1>
      <Explorer catalogs={labels} initialLayers={requested.length ? requested : ALL_LAYERS} />
    </div>
  );
}
