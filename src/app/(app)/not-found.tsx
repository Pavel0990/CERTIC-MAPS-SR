import { NotFoundContent } from '@/components/shared/not-found-content';

// notFound() dentro de la app (una ficha que ya no existe): el layout ya pone el <main id="contenido">
export default function AppNotFound() {
  return (
    <div className="mx-auto flex min-h-[60dvh] max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <NotFoundContent />
    </div>
  );
}
