'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { CheckCircle2, CircleAlert, Info, X } from 'lucide-react';
import { cn } from '@/utils/cn';

type ToastTone = 'ok' | 'error' | 'info';
interface ToastItem { id: number; tone: ToastTone; message: string }
interface ToastApi { show: (message: string, tone?: ToastTone) => void }

const ToastContext = createContext<ToastApi | null>(null);

/** Tiempo en pantalla de los avisos de éxito o información. Los de error se quedan hasta que se cierran (WCAG 2.2.1). */
const TOAST_MS = 7000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(0);
  const dismiss = useCallback((id: number) => setItems((xs) => xs.filter((t) => t.id !== id)), []);
  const show = useCallback((message: string, tone: ToastTone = 'ok') => {
    const id = ++seq.current;
    setItems((xs) => [...xs.slice(-2), { id, tone, message }]);
  }, []);
  const api = useMemo(() => ({ show }), [show]);
  return (
    <ToastContext.Provider value={api}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-[70] flex flex-col items-center gap-2 px-4 md:bottom-6">
        {items.map((t) => <Toast key={t.id} item={t} onClose={() => dismiss(t.id)} />)}
      </div>
    </ToastContext.Provider>
  );
}

const ICON = { ok: CheckCircle2, error: CircleAlert, info: Info };

/** Un aviso. Mientras tiene el puntero o el foco no se cierra, para quien lee despacio. */
function Toast({ item, onClose }: { item: ToastItem; onClose: () => void }) {
  const [paused, setPaused] = useState(false);
  const left = useRef(TOAST_MS);
  useEffect(() => {
    if (item.tone === 'error' || paused) return;
    const started = Date.now();
    const timer = setTimeout(onClose, left.current);
    return () => {
      clearTimeout(timer);
      left.current -= Date.now() - started;
    };
  }, [item.tone, paused, onClose]);
  const I = ICON[item.tone];
  return (
    <div
      role={item.tone === 'error' ? 'alert' : 'status'}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className={cn(
        'pointer-events-auto flex w-full max-w-md animate-sheet-in items-center gap-3 rounded-[14px] py-1 pl-4 pr-1 text-[15px] font-medium shadow-[var(--shadow-float)]',
        item.tone === 'error' ? 'bg-danger text-white' : 'bg-ink text-on-ink',
      )}
    >
      <I className="size-5 shrink-0" aria-hidden />
      <span className="flex-1 py-2">{item.message}</span>
      <button type="button" onClick={onClose} aria-label="Cerrar aviso" className="grid size-11 shrink-0 place-items-center rounded-full hover:bg-white/15">
        <X className="size-5" />
      </button>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast fuera de ToastProvider');
  return ctx;
}
