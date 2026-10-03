'use client';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Button, type ButtonProps } from '@/components/ui/button';
import { Field, Textarea } from '@/components/ui/form';
import { Sheet } from '@/components/ui/sheet';
import { useToast } from '@/components/ui/toast';
import { reasonMessage } from '@/lib/vocabulary';
import type { ActionResult } from '../actions';

interface Props {
  label: string;
  done: string;
  run: (text?: string) => Promise<ActionResult>;
  variant?: ButtonProps['variant'];
  icon?: React.ReactNode;
  /** Pide un texto antes de ejecutar (motivo del rechazo, nota de resolución…). */
  ask?: { title: string; label: string; hint?: string; required?: boolean };
}

/**
 * Botón de una acción del panel. Muestra el resultado en lenguaje simple; si otra persona se adelantó
 * (stale_state, compare-and-set), refresca la vista para mostrar el estado actual.
 */
export function ActionButton({ label, done, run, variant = 'secondary', icon, ask }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');

  function execute(value?: string) {
    start(async () => {
      const r = await run(value);
      if (r.status === 'ok') {
        toast.show(done);
        setOpen(false);
        setText('');
      } else {
        toast.show(reasonMessage(r.reason), 'error');
      }
      router.refresh();
    });
  }

  if (!ask) {
    return (
      <Button size="sm" variant={variant} icon={icon} loading={pending} onClick={() => execute()}>
        {label}
      </Button>
    );
  }
  const valid = !ask.required || text.trim().length >= 3;
  return (
    <>
      <Button size="sm" variant={variant} icon={icon} onClick={() => setOpen(true)}>
        {label}
      </Button>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={ask.title}
        side="center"
        footer={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button className="flex-1" loading={pending} disabled={!valid} onClick={() => execute(text.trim() || undefined)}>
              {label}
            </Button>
          </div>
        }
      >
        <Field label={ask.label} hint={ask.hint} optional={!ask.required}>
          {(a) => <Textarea {...a} value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} autoFocus />}
        </Field>
      </Sheet>
    </>
  );
}
