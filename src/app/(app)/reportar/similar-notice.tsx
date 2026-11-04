'use client';
import Link from 'next/link';
import type { RefObject } from 'react';
import { ArrowRight, Eye, MapPin, ThumbsUp } from 'lucide-react';
import type { SimilarNoticeModel } from '@/modules/citizen-reports';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils/cn';

const big = 'min-h-[52px] w-full rounded-full px-5 text-[17px] font-bold';

/**
 * "Ya hay un reporte parecido aquí": se muestra después de elegir tipo y lugar, si hay uno abierto del mismo tipo
 * a menos de 150 m. Una sola decisión, con botones grandes. Nunca bloquea: "Crear el mío igual" sigue al paso 3.
 */
export function SimilarNotice({
  model, headingRef, supporting, supported, onSupport, onContinue,
}: {
  model: SimilarNoticeModel;
  headingRef: RefObject<HTMLHeadingElement | null>;
  supporting: boolean;
  /** Ya sumó su apoyo desde este aviso */
  supported: boolean;
  onSupport: (requestId: string) => void;
  onContinue: () => void;
}) {
  return (
    <section aria-labelledby="similar-title" className="animate-step-in flex flex-col px-4 pb-8 pt-5">
      <div className="flex size-14 items-center justify-center rounded-full bg-warn-soft text-warn">
        <MapPin className="size-7" aria-hidden />
      </div>
      <h1 id="similar-title" ref={headingRef} tabIndex={-1} className="mt-4 text-[28px] font-extrabold leading-tight outline-none">
        {supported ? '¡Gracias por tu apoyo!' : model.title}
      </h1>
      <p className="mt-2 text-[17px] text-muted">
        {supported ? 'El municipio verá que a más personas les afecta. No hace falta que envíes otro.' : model.question}
      </p>

      <div className="mt-5 rounded-[18px] bg-surface p-4 shadow-[var(--shadow-card)]">
        <p className="text-lg font-bold">{model.details[0]}</p>
        <p className="mt-1 text-[16px] text-muted">{model.details.slice(1).join(' · ')}</p>
        {model.more > 0 && (
          <p className="mt-2 text-[15px] text-muted">
            {model.more === 1 ? 'Hay 1 reporte parecido más' : `Hay ${model.more} reportes parecidos más`} a menos de 150 m.
          </p>
        )}
      </div>

      <div className="mt-5 flex flex-col gap-3">
        {model.actions.map((a, i) => {
          const primary = i === 0 && !supported;
          if (a.kind === 'support') {
            if (supported) return null;
            return (
              <Button key="support" size="lg" className={big} loading={supporting} icon={<ThumbsUp className="size-5" aria-hidden />} onClick={() => onSupport(a.requestId)}>
                {a.label}
              </Button>
            );
          }
          if (a.kind === 'view') {
            return (
              <Link
                key="view"
                prefetch={false}
                href={a.href}
                className={cn(
                  'press inline-flex items-center justify-center gap-2.5',
                  big,
                  primary || supported ? 'bg-brand text-on-brand shadow-sm hover:bg-brand-strong' : 'bg-brand-soft text-brand-strong hover:bg-brand-soft-strong',
                )}
              >
                <Eye className="size-5" aria-hidden />
                {a.label}
              </Link>
            );
          }
          return (
            <Button key="continue" size="lg" variant="secondary" className={big} icon={<ArrowRight className="size-5" aria-hidden />} onClick={onContinue}>
              {a.label}
            </Button>
          );
        })}
      </div>
      <p className="mt-4 text-center text-sm text-muted">Si es otro problema, crea el tuyo: no pasa nada.</p>
    </section>
  );
}
