'use client';
import { usePathname } from 'next/navigation';
import { Skeleton } from '@/components/ui/primitives';
import { cn } from '@/utils/cn';

type Shape = 'map' | 'detail' | 'form' | 'list';

const UUID_SEGMENT = /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function shapeOf(path: string): Shape {
  if (path === '/' || path.startsWith('/mapa')) return 'map';
  if (/\/(editar|registrar)$/.test(path) || path === '/reportar' || path === '/proponer') return 'form';
  if (UUID_SEGMENT.test(path)) return 'detail';
  return 'list';
}

/**
 * Lo que se ve en el instante en que se toca un botón, mientras llega la página: la forma de lo que viene.
 * Sin esto la pantalla se queda quieta hasta que responde el servidor y la persona vuelve a tocar.
 * También permite que Next precargue cada ruta hasta este punto (las páginas son dinámicas por la CSP con nonce).
 */
export function RouteLoading() {
  const shape = shapeOf(usePathname());
  return (
    <div data-loading aria-busy="true">
      <p role="status" className="sr-only">Cargando…</p>
      {shape === 'map' ? <MapShape /> : (
        <div className={cn('mx-auto w-full px-4 pb-10 pt-5 md:px-8 md:pt-8', shape === 'list' ? 'max-w-6xl' : 'max-w-3xl')}>
          {shape === 'detail' && <Skeleton className="mb-5 aspect-[16/9] w-full rounded-[20px]" />}
          <div className="mb-6 flex flex-col gap-2.5">
            <Skeleton className="h-9 w-2/3 max-w-sm" />
            <Skeleton className="h-5 w-full max-w-md" />
          </div>
          {shape === 'list' && <ListShape />}
          {shape === 'detail' && <DetailShape />}
          {shape === 'form' && <FormShape />}
        </div>
      )}
    </div>
  );
}

function MapShape() {
  return (
    <div className="relative h-[calc(100dvh-68px-env(safe-area-inset-bottom))] bg-canvas md:h-dvh">
      <div className="absolute inset-x-4 top-4 flex flex-col gap-3 md:left-6 md:right-auto md:w-[380px]">
        <Skeleton className="h-14 rounded-full" />
        <div className="flex gap-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-10 w-24 rounded-full" />)}</div>
      </div>
    </div>
  );
}

function ListShape() {
  return (
    <>
      <div className="mb-5 flex gap-2 overflow-hidden">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-11 w-28 shrink-0 rounded-full" />)}</div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-[112px] rounded-[18px]" />)}
      </div>
    </>
  );
}

function DetailShape() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Skeleton className="h-[52px] w-full rounded-[14px] sm:w-44" />
        <Skeleton className="h-[52px] w-full rounded-[14px] sm:w-36" />
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-11/12" />
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="mt-2 h-[140px] rounded-[18px]" />
    </div>
  );
}

function FormShape() {
  return (
    <div className="flex flex-col gap-5">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex flex-col gap-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-[52px] rounded-[14px]" />
        </div>
      ))}
      <Skeleton className="mt-2 h-[52px] rounded-[14px]" />
    </div>
  );
}
