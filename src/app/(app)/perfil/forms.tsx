'use client';
import { useActionState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Field, Input, Select } from '@/components/ui/form';
import { ErrorNote } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { saveProfile, savePreferences, type FormState } from './actions';

function useSavedToast(state: FormState, message: string) {
  const toast = useToast();
  useEffect(() => {
    if (state.ok) toast.show(message);
  }, [state, message, toast]);
}

export function ProfileForm({ name, municipalityId, municipalities }: { name: string; municipalityId: string | null; municipalities: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(saveProfile, {});
  useSavedToast(state, 'Guardamos tus datos.');
  return (
    <form action={action} className="flex flex-col gap-4">
      {state.error && <ErrorNote>{state.error}</ErrorNote>}
      <Field label="Tu nombre" hint="Solo lo ve el personal del municipio; en el mapa público nunca aparece.">
        {(a) => <Input {...a} name="display_name" defaultValue={name} maxLength={80} autoComplete="name" required />}
      </Field>
      <Field label="¿En qué municipio vives?" hint="Para avisarte de alertas de tránsito cerca de ti.">
        {(a) => (
          <Select {...a} name="home_municipality_id" defaultValue={municipalityId ?? ''}>
            <option value="">Prefiero no decirlo</option>
            {municipalities.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </Select>
        )}
      </Field>
      <Button type="submit" loading={pending} className="self-start">Guardar</Button>
    </form>
  );
}

export function PreferencesForm({
  topics, selectedTopics, municipalities, selectedMunicipalities,
}: {
  topics: readonly { id: string; label: string; hint: string }[];
  selectedTopics: string[];
  municipalities: { id: string; name: string }[];
  selectedMunicipalities: string[];
}) {
  const [state, action, pending] = useActionState(savePreferences, {});
  useSavedToast(state, 'Guardamos tus avisos.');
  return (
    <form action={action} className="flex flex-col gap-5">
      {state.error && <ErrorNote>{state.error}</ErrorNote>}
      <fieldset className="flex flex-col gap-1">
        <legend className="mb-2 text-[15px] font-semibold">Quiero que me avisen de…</legend>
        {topics.map((t) => (
          <label key={t.id} className="flex cursor-pointer items-start gap-3 rounded-[12px] p-2.5 hover:bg-canvas">
            <input type="checkbox" name="topics" value={t.id} defaultChecked={selectedTopics.includes(t.id)} className="mt-0.5 size-6 shrink-0 accent-[#2f6feb]" />
            <span>
              <span className="block font-semibold">{t.label}</span>
              <span className="block text-sm text-muted">{t.hint}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <fieldset>
        <legend className="mb-1 text-[15px] font-semibold">Alertas también de estos municipios</legend>
        <p className="mb-2 text-sm text-muted">Si no marcas ninguno, usamos el municipio donde vives.</p>
        <div className="flex flex-wrap gap-2">
          {municipalities.map((m) => (
            <label key={m.id} className="flex cursor-pointer items-center gap-2 rounded-full border border-line-strong bg-surface px-3.5 py-2 has-[:checked]:border-brand has-[:checked]:bg-brand-soft has-[:checked]:text-brand-strong">
              <input type="checkbox" name="municipalities" value={m.id} defaultChecked={selectedMunicipalities.includes(m.id)} className="size-4 accent-[#2f6feb]" />
              <span className="text-[15px] font-semibold">{m.name}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <Button type="submit" loading={pending} className="self-start">Guardar avisos</Button>
    </form>
  );
}
