'use client';
import { useState } from 'react';
import { DIFFICULTIES, ROUTE_KINDS } from '@/modules/routes';
import { PLACE_SERVICES } from '@/modules/tourism';
import { Button } from '@/components/ui/button';
import { Field, Input, Select, Textarea } from '@/components/ui/form';
import { ErrorNote } from '@/components/ui/primitives';
import { DIFFICULTY, ROUTE_KIND } from '@/lib/vocabulary';
import { ServicesField } from '../../../_contenido/services-field';
import { markedServices, useSave } from '../../../_contenido/use-save';
import { saveRoute } from './actions';

export interface RouteFormValues {
  id: string;
  version: number;
  name: string;
  kind: string;
  difficulty: string;
  duration_min: number;
  description: string;
  services: Record<string, boolean>;
}

export function RouteForm({ initial }: { initial: RouteFormValues }) {
  const [v, setV] = useState(initial);
  const { error, pending, run } = useSave();
  const set = <K extends keyof RouteFormValues>(k: K, value: RouteFormValues[K]) => setV((s) => ({ ...s, [k]: value }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    run(() => saveRoute({ ...v, services: markedServices(v.services) }), 'Guardamos los cambios.', `/rutas/${v.id}`);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      {error && <ErrorNote>{error}</ErrorNote>}
      <Field label="Nombre">{(a) => <Input {...a} value={v.name} maxLength={120} required onChange={(e) => set('name', e.target.value)} />}</Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Tipo de ruta">
          {(a) => (
            <Select {...a} value={v.kind} onChange={(e) => set('kind', e.target.value)}>
              {ROUTE_KINDS.map((k) => <option key={k} value={k}>{ROUTE_KIND[k] ?? k}</option>)}
            </Select>
          )}
        </Field>
        <Field label="Dificultad">
          {(a) => (
            <Select {...a} value={v.difficulty} onChange={(e) => set('difficulty', e.target.value)}>
              {DIFFICULTIES.map((d) => <option key={d} value={d}>{DIFFICULTY[d]?.label ?? d}</option>)}
            </Select>
          )}
        </Field>
      </div>
      <Field label="Duración en minutos" hint="A paso tranquilo, de ida y vuelta si es el caso.">
        {(a) => <Input {...a} type="number" inputMode="numeric" min={5} max={2880} value={v.duration_min} onChange={(e) => set('duration_min', Number(e.target.value))} />}
      </Field>
      <Field label="Descripción" optional hint="Qué se ve en el camino, dónde empieza y qué llevar.">
        {(a) => <Textarea {...a} value={v.description} maxLength={3000} onChange={(e) => set('description', e.target.value)} />}
      </Field>
      <ServicesField options={PLACE_SERVICES} value={v.services} onChange={(s) => set('services', s)} />
      <Button type="submit" size="lg" loading={pending}>Guardar cambios</Button>
    </form>
  );
}
