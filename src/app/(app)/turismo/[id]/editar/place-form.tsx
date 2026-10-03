'use client';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { PLACE_KINDS, PLACE_SERVICES } from '@/modules/tourism';
import { Button } from '@/components/ui/button';
import { Field, Input, Select, Textarea } from '@/components/ui/form';
import { ErrorNote } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { PLACE_KIND } from '@/lib/vocabulary';
import { ServicesField } from '../../../_contenido/services-field';
import { savePlace } from './actions';

export interface PlaceFormValues {
  id: string;
  version: number;
  name: string;
  kind: string;
  description: string;
  accessibility: string;
  opening_info: string;
  services: Record<string, boolean>;
}

export function PlaceForm({ initial }: { initial: PlaceFormValues }) {
  const router = useRouter();
  const toast = useToast();
  const [v, setV] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const set = <K extends keyof PlaceFormValues>(k: K, value: PlaceFormValues[K]) => setV((s) => ({ ...s, [k]: value }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      // Solo se guardan los servicios marcados: lo no marcado queda "sin dato" en vez de "no hay"
      const services = Object.fromEntries(Object.entries(v.services).filter(([, on]) => on));
      const r = await savePlace({ ...v, services });
      if (r.status === 'rejected') {
        setError(r.message);
        if (r.reason === 'version_conflict') router.refresh();
        return;
      }
      toast.show('Guardamos los cambios.');
      router.push(`/turismo/${v.id}`);
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      {error && <ErrorNote>{error}</ErrorNote>}
      <Field label="Nombre">{(a) => <Input {...a} value={v.name} maxLength={120} required onChange={(e) => set('name', e.target.value)} />}</Field>
      <Field label="Tipo de lugar">
        {(a) => (
          <Select {...a} value={v.kind} onChange={(e) => set('kind', e.target.value)}>
            {PLACE_KINDS.map((k) => <option key={k} value={k}>{PLACE_KIND[k] ?? k}</option>)}
          </Select>
        )}
      </Field>
      <Field label="Descripción" optional hint="Qué hay, qué se puede hacer y por qué vale la pena.">
        {(a) => <Textarea {...a} value={v.description} maxLength={3000} onChange={(e) => set('description', e.target.value)} />}
      </Field>
      <Field label="Horario" optional hint="Por ejemplo: «Todo el día» o «De 8:00 a. m. a 5:00 p. m.».">
        {(a) => <Input {...a} value={v.opening_info} maxLength={300} onChange={(e) => set('opening_info', e.target.value)} />}
      </Field>
      <Field label="Acceso" optional hint="Cómo se llega y si hay escalones o tramos difíciles.">
        {(a) => <Textarea {...a} value={v.accessibility} maxLength={500} onChange={(e) => set('accessibility', e.target.value)} />}
      </Field>
      <ServicesField options={PLACE_SERVICES} value={v.services} onChange={(s) => set('services', s)} />
      <Button type="submit" size="lg" loading={pending}>Guardar cambios</Button>
    </form>
  );
}
