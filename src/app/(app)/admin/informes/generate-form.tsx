'use client';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { FilePlus2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, Select } from '@/components/ui/form';
import { useToast } from '@/components/ui/toast';
import { reasonMessage } from '@/lib/vocabulary';
import { generateReport } from '../actions';

/** "Generar ahora" (solo administración provincial): nueva versión de una semana cerrada; las anteriores se conservan. */
export function GenerateForm({ weeks }: { weeks: { value: string; label: string }[] }) {
  const [week, setWeek] = useState(weeks[0]?.value ?? '');
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="min-w-0 flex-1">
        <Field label="Semana">
          {(a) => (
            <Select {...a} value={week} onChange={(e) => setWeek(e.target.value)}>
              {weeks.map((w) => <option key={w.value} value={w.value}>{w.label}</option>)}
            </Select>
          )}
        </Field>
      </div>
      <Button
        loading={pending}
        disabled={!week}
        icon={<FilePlus2 className="size-4" />}
        onClick={() =>
          start(async () => {
            const r = await generateReport(week);
            toast.show(r.status === 'ok' ? 'Generando el informe. Aparecerá en la lista en unos segundos.' : reasonMessage(r.reason), r.status === 'ok' ? 'ok' : 'error');
            router.refresh();
          })
        }
      >
        Generar ahora
      </Button>
    </div>
  );
}
