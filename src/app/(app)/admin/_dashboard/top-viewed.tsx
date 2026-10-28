import Link from 'next/link';
import { Eye, MessageCircle, Navigation } from 'lucide-react';
import type { Dashboard } from '@/modules/admin/server';
import { cn } from '@/utils/cn';
import { formatNumber } from '@/utils/format';
import { Empty } from './blocks';

type Viewed = Dashboard['topViewed'][number];

/** Color de la capa de cada ficha, el mismo que en el mapa. */
const layerColor = (entity: Viewed['entity']) => (entity === 'business' ? 'bg-layer-business' : entity === 'tourism_place' ? 'bg-layer-tourism' : 'bg-layer-route');

/** "Lo más visto": lista en el teléfono (para que «Cómo llegar» y «WhatsApp» no queden ocultos a la derecha), tabla desde 768 px. */
export function TopViewed({ rows }: { rows: Viewed[] }) {
  if (rows.length === 0) return <Empty icon={<Eye />}>Todavía no hay visitas a fichas en este periodo.</Empty>;
  return (
    <>
      <ol className="flex flex-col md:hidden">
        {rows.map((v) => (
          <li key={v.id} className="border-b border-line last:border-0">
            <Link prefetch={false} href={v.href} className="press-soft flex min-h-12 items-start gap-2.5 rounded-[12px] px-1 py-2.5 transition-colors duration-200 hover:bg-canvas">
              <span className={cn('mt-0.5 h-10 w-1 shrink-0 rounded-full', layerColor(v.entity))} aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{v.name}</span>
                <span className="mt-0.5 block text-sm text-muted tabular-nums">
                  {formatNumber(v.views)} {v.views === 1 ? 'visita' : 'visitas'} · {formatNumber(v.directions)} cómo llegar · {formatNumber(v.whatsapp)} WhatsApp
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
      <div className="-mx-5 hidden overflow-x-auto md:block">
        <table className="w-full min-w-[420px] text-left text-[15px]">
          <thead className="border-b border-line text-[14px] font-semibold text-muted">
            <tr>
              <th scope="col" className="px-5 py-2">Ficha</th>
              <th scope="col" className="px-2 py-2 text-right"><Eye className="ml-auto size-4" aria-label="Visitas" /></th>
              <th scope="col" className="px-2 py-2 text-right"><Navigation className="ml-auto size-4" aria-label="Cómo llegar" /></th>
              <th scope="col" className="px-5 py-2 text-right"><MessageCircle className="ml-auto size-4" aria-label="WhatsApp" /></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((v) => (
              <tr key={v.id} className="border-b border-line transition-colors duration-200 last:border-0 hover:bg-canvas">
                <td className="px-5 py-0.5">
                  <Link prefetch={false} href={v.href} className="flex min-h-11 items-center gap-2.5 font-semibold hover:text-brand">
                    <span className={cn('h-6 w-1 shrink-0 rounded-full', layerColor(v.entity))} aria-hidden />
                    <span className="truncate">{v.name}</span>
                  </Link>
                </td>
                <td className="px-2 text-right font-semibold tabular-nums">{formatNumber(v.views)}</td>
                <td className="px-2 text-right tabular-nums text-muted">{formatNumber(v.directions)}</td>
                <td className="px-5 text-right tabular-nums text-muted">{formatNumber(v.whatsapp)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
