'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { PLACE_KINDS, placeProposalInput } from '@/modules/tourism';
import type { LatLng } from '@/modules/map';
import { Button } from '@/components/ui/button';
import { Field, Input, Textarea } from '@/components/ui/form';
import { ErrorNote } from '@/components/ui/primitives';
import { PLACE_KIND } from '@/lib/vocabulary';
import { LocationPicker } from '../_contenido/location-picker';
import { PhotoPicker, usePhotos } from '../_contenido/photo-picker';
import { ChoiceGrid, DoneScreen, StepTitle, WizardHeader } from '../_contenido/wizard';
import { submitPlace } from './actions';

type Kind = (typeof PLACE_KINDS)[number];

export function PlaceWizard({ staff }: { staff: boolean }) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [kind, setKind] = useState<Kind | ''>('');
  const [name, setName] = useState('');
  const [point, setPoint] = useState<LatLng | null>(null);
  const [description, setDescription] = useState('');
  const photos = usePhotos(5);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ id: string; published: boolean; photoError: string | null } | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => heading.current?.focus(), [step, done]);

  async function submit() {
    if (!point) return;
    setError(null);
    const parsed = placeProposalInput.safeParse({ name, kind, lat: point.lat, lng: point.lng, description });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Revisa los datos.');
      return;
    }
    setBusy(true);
    const r = await submitPlace(parsed.data);
    if (r.status === 'rejected') {
      setBusy(false);
      setError(r.message);
      if (r.reason === 'out_of_area' || r.reason === 'invalid_coordinates') setStep(2);
      return;
    }
    // El personal publica directo; las fotos solo se pueden subir mientras está pendiente o siendo personal
    const photoError = await photos.upload('tourism_place', r.id);
    setBusy(false);
    setDone({ id: r.id, published: r.extra?.place_status === 'published', photoError });
  }

  if (done) {
    return (
      <DoneScreen
        headingRef={heading}
        title={done.published ? 'Lugar publicado' : '¡Gracias por tu propuesta!'}
        message={done.published ? 'Ya aparece en el mapa.' : 'Un moderador del municipio la revisará. Te avisaremos cuando aparezca en el mapa.'}
        photoError={done.photoError}
        primary={{ href: `/turismo/${done.id}`, label: 'Ver el lugar' }}
        secondary={{ href: '/', label: 'Volver al mapa' }}
      />
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col">
      <WizardHeader step={step} total={3} onBack={() => setStep((s) => (s - 1) as 1 | 2)} />

      {step === 1 && (
        <section className="flex flex-col gap-5 px-4 pb-8 pt-5">
          <StepTitle headingRef={heading} title="Proponer un lugar" hint="Un sitio bonito o importante de la provincia que todos deberían conocer." />
          <p className="-mt-2 text-[15px]">
            ¿Es un recorrido o sendero? <Link href="/proponer?que=ruta" className="font-semibold text-brand underline">Proponer una ruta</Link>
          </p>
          <ChoiceGrid legend="¿Qué tipo de lugar es?" options={PLACE_KINDS.map((k) => ({ value: k, label: PLACE_KIND[k] ?? k }))} value={kind} onChange={setKind} />
          <Field label="Nombre del lugar" hint="Como lo llama la gente. Por ejemplo: «Mirador de La Leonor».">
            {(a) => <Input {...a} value={name} maxLength={120} onChange={(e) => setName(e.target.value)} />}
          </Field>
          <Button size="lg" disabled={!kind || name.trim().length < 2} onClick={() => setStep(2)}>Seguir</Button>
        </section>
      )}

      {step === 2 && (
        <section className="flex flex-col px-4 pb-8 pt-5">
          <StepTitle headingRef={heading} title="¿Dónde está?" hint="Mueve el mapa hasta que el pin rojo quede sobre el lugar." />
          {error && <div className="mt-3"><ErrorNote>{error}</ErrorNote></div>}
          <LocationPicker onChange={setPoint} initial={point} ariaLabel="Mapa para marcar dónde está el lugar" />
          <Button size="lg" className="mt-5" disabled={!point} onClick={() => { setError(null); setStep(3); }}>El pin está en el lugar</Button>
        </section>
      )}

      {step === 3 && (
        <section className="flex flex-col gap-5 px-4 pb-8 pt-5">
          <StepTitle headingRef={heading} title="Cuéntanos del lugar" hint={`${PLACE_KIND[kind] ?? ''} · ${name.trim()}`} />
          {error && <ErrorNote>{error}</ErrorNote>}
          <Field label="¿Qué hay y por qué vale la pena?" optional hint="Por ejemplo: «se ve todo el valle, hay sombra y un ventorrillo los domingos».">
            {(a) => <Textarea {...a} value={description} maxLength={3000} onChange={(e) => setDescription(e.target.value)} />}
          </Field>
          <PhotoPicker state={photos} hint="Una buena foto ayuda al municipio a aprobarlo." />
          <Button size="lg" onClick={submit} loading={busy}>{staff ? 'Publicar lugar' : 'Enviar propuesta'}</Button>
          <p className="text-center text-sm text-muted">{staff ? 'Si es de tu municipio, se publica directamente.' : 'Tu nombre no aparece en el mapa público.'}</p>
        </section>
      )}
    </div>
  );
}
