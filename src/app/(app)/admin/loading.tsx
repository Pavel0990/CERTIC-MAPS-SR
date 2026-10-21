import { Skeleton } from '@/components/ui/primitives';

/** Mientras carga el panel: la forma de lo que viene (encabezado, tarjetas y paneles), no un spinner suelto. */
export default function AdminLoading() {
  return (
    <div className="flex flex-col gap-5" aria-busy="true" aria-label="Cargando el panel">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-9 w-72 max-w-full" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <Skeleton className="h-12 w-72 max-w-full rounded-full" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[150px] rounded-[18px]" />)}
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Skeleton className="h-[320px] rounded-[18px]" />
        <Skeleton className="h-[320px] rounded-[18px]" />
      </div>
    </div>
  );
}
