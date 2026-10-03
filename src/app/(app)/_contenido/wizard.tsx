'use client';
import Link from 'next/link';
import type { ReactNode, RefObject } from 'react';
import { Check, ChevronLeft, X } from 'lucide-react';
import { Notice } from '@/components/ui/primitives';
import { cn } from '@/utils/cn';

/** Barra de progreso de un asistente por pasos (mismo diseño que /reportar). */
export function WizardHeader({ step, total, onBack, cancelHref = '/perfil' }: { step: number; total: number; onBack: () => void; cancelHref?: string }) {
  return (
    <div className="flex items-center gap-3 px-4 pt-4">
      {step > 1 ? (
        <button type="button" onClick={onBack} aria-label="Volver al paso anterior" className="flex size-11 items-center justify-center rounded-full bg-surface shadow-[var(--shadow-card)]">
          <ChevronLeft className="size-5" />
        </button>
      ) : (
        <Link href={cancelHref} aria-label="Cancelar" className="flex size-11 items-center justify-center rounded-full bg-surface shadow-[var(--shadow-card)]">
          <X className="size-5" />
        </Link>
      )}
      <ol className="flex flex-1 gap-1.5" aria-label={`Paso ${step} de ${total}`}>
        {Array.from({ length: total }, (_, i) => (
          <li key={i} className={cn('h-1.5 flex-1 rounded-full', i < step ? 'bg-brand' : 'bg-line-strong')} />
        ))}
      </ol>
      <span className="text-sm font-semibold text-muted">{step} de {total}</span>
    </div>
  );
}

/** Título de un paso: recibe el foco al cambiar de paso (lectores de pantalla y teclado). */
export function StepTitle({ headingRef, title, hint }: { headingRef: RefObject<HTMLHeadingElement | null>; title: string; hint?: string }) {
  return (
    <div>
      <h1 ref={headingRef} tabIndex={-1} className="text-[28px] font-extrabold outline-none">{title}</h1>
      {hint && <p className="mt-1 text-[17px] text-muted">{hint}</p>}
    </div>
  );
}

/** Pantalla final de un envío. */
export function DoneScreen({
  headingRef, title, message, photoError, primary, secondary,
}: {
  headingRef: RefObject<HTMLHeadingElement | null>;
  title: string;
  message: ReactNode;
  photoError?: string | null;
  primary: { href: string; label: string };
  secondary?: { href: string; label: string };
}) {
  return (
    <section className="mx-auto flex max-w-md flex-col items-center px-6 py-16 text-center">
      <div className="flex size-20 items-center justify-center rounded-full bg-ok-soft text-ok">
        <Check className="size-10" aria-hidden />
      </div>
      <h1 ref={headingRef} tabIndex={-1} className="mt-6 text-[28px] font-extrabold outline-none">{title}</h1>
      <div className="mt-2 text-[17px] text-muted">{message}</div>
      {photoError && <div className="mt-4 w-full"><Notice tone="warn">Algunas fotos no se pudieron subir: {photoError}</Notice></div>}
      <div className="mt-8 flex w-full flex-col gap-2">
        <Link href={primary.href} className="inline-flex h-13 min-h-[52px] items-center justify-center rounded-[14px] bg-ink font-semibold text-white">{primary.label}</Link>
        {secondary && <Link href={secondary.href} className="inline-flex h-12 items-center justify-center rounded-[14px] font-semibold text-ink hover:bg-surface">{secondary.label}</Link>}
      </div>
    </section>
  );
}

/** Botones grandes para elegir una opción (tipo de lugar, dificultad…). */
export function ChoiceGrid<T extends string>({ legend, options, value, onChange, columns = 2 }: { legend: string; options: { value: T; label: string }[]; value: T | ''; onChange: (v: T) => void; columns?: 2 | 3 }) {
  return (
    <fieldset>
      <legend className="text-[15px] font-semibold">{legend}</legend>
      <div className={cn('mt-2 grid gap-2', columns === 3 ? 'grid-cols-3' : 'grid-cols-2')}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={value === o.value}
            onClick={() => onChange(o.value)}
            className={cn('flex min-h-14 items-center justify-center gap-2 rounded-[14px] border-2 px-3 text-center text-[16px] font-bold leading-tight transition', value === o.value ? 'border-brand bg-brand-soft text-brand-strong' : 'border-line bg-surface text-ink hover:border-line-strong')}
          >
            {value === o.value && <Check className="size-4 shrink-0" aria-hidden />}
            {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
