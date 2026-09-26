'use client';
import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/utils/cn';

/**
 * Panel modal: hoja inferior en móvil, diálogo lateral en escritorio (§6.3).
 * Usa <dialog> nativo: foco atrapado, Escape y fondo inerte sin librerías.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
  side = 'right',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  side?: 'right' | 'center';
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-label={title}
      className={cn(
        'm-0 mt-auto max-h-[92dvh] w-full max-w-none bg-transparent p-0 backdrop:bg-ink/40 backdrop:backdrop-blur-[2px] open:animate-sheet-in',
        side === 'right' ? 'md:mt-0 md:ml-auto md:h-dvh md:max-h-dvh md:w-[440px]' : 'md:m-auto md:w-[520px]',
      )}
    >
      <div className={cn('flex max-h-[92dvh] flex-col rounded-t-[24px] bg-surface', side === 'right' ? 'md:h-dvh md:max-h-dvh md:rounded-none' : 'md:rounded-[24px]')}>
        <div className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-line-strong md:hidden" aria-hidden />
        <header className="flex items-center gap-3 px-5 pb-2 pt-3">
          <h2 className="flex-1 text-xl font-bold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="flex size-10 items-center justify-center rounded-full bg-canvas hover:bg-line">
            <X className="size-5" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 pb-5">{children}</div>
        {footer && <div className="border-t border-line px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{footer}</div>}
      </div>
    </dialog>
  );
}
