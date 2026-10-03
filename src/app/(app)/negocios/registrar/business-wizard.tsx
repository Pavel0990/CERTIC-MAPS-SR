'use client';
import { useEffect, useRef, useState } from 'react';
import {
  Coffee, HeartPulse, Hotel, Palette, ShoppingBasket, Sprout, Store, UtensilsCrossed, Wrench, type LucideIcon,
} from 'lucide-react';
import { businessInput } from '@/modules/businesses';
import type { LatLng } from '@/modules/map';
import { Button } from '@/components/ui/button';
import { Field, Input, Textarea } from '@/components/ui/form';
import { ErrorNote } from '@/components/ui/primitives';
import { cn } from '@/utils/cn';
import { LocationPicker } from '../../_contenido/location-picker';
import { PhotoPicker, usePhotos } from '../../_contenido/photo-picker';
import { DoneScreen, StepTitle, WizardHeader } from '../../_contenido/wizard';
import { registerBusiness } from './actions';

const ICONS: Record<string, LucideIcon> = {
  colmado: ShoppingBasket, restaurante: UtensilsCrossed, cafeteria: Coffee, hotel: Hotel, agroturismo: Sprout,
  artesania: Palette, servicios: Wrench, salud: HeartPulse,
};
const newKey = () => crypto.randomUUID().replace(/-/g, '');

export function BusinessWizard({ categories }: { categories: { slug: string; name: string }[] }) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [category, setCategory] = useState('');
  const [name, setName] = useState('');
  const [point, setPoint] = useState<LatLng | null>(null);
  const [contact, setContact] = useState({ whatsapp: '', phone: '', address: '', description: '', email: '', website: '' });
  const photos = usePhotos(5);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ id: string; photoError: string | null } | null>(null);
  const [key] = useState(newKey); // misma clave en todos los reintentos de este registro
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => heading.current?.focus(), [step, done]);

  const nameOk = name.trim().length >= 2;
  const setField = (k: keyof typeof contact) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setContact((c) => ({ ...c, [k]: e.target.value }));

  async function submit() {
    if (!point) return;
    setError(null);
    const parsed = businessInput.safeParse({ name, categorySlug: category, lat: point.lat, lng: point.lng, idempotencyKey: key, ...contact });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Revisa los datos.');
      return;
    }
    setBusy(true);
    const r = await registerBusiness(parsed.data);
    if (r.status === 'rejected') {
      setBusy(false);
      setError(r.message);
      if (r.reason === 'out_of_area' || r.reason === 'invalid_coordinates') setStep(2);
      if (r.reason === 'invalid_category' || r.reason === 'invalid_name') setStep(1);
      return;
    }
    const photoError = await photos.upload('business', r.id);
    setBusy(false);
    setDone({ id: r.id, photoError });
  }

  if (done) {
    return (
      <DoneScreen
        headingRef={heading}
        title="¡Listo! Recibimos tu negocio"
        message="Un moderador del municipio lo revisará. Te avisaremos cuando aparezca en el mapa. Mientras tanto ya puedes poner tu horario."
        photoError={done.photoError}
        primary={{ href: `/negocio/${done.id}`, label: 'Ir a mi negocio' }}
        secondary={{ href: '/', label: 'Volver al mapa' }}
      />
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col">
      <WizardHeader step={step} total={3} onBack={() => setStep((s) => (s - 1) as 1 | 2)} />

      {step === 1 && (
        <section className="flex flex-col gap-5 px-4 pb-8 pt-5">
          <StepTitle headingRef={heading} title="¿Qué negocio tienes?" hint="Aparecerá gratis en el mapa de la provincia cuando el municipio lo apruebe." />
          {error && <ErrorNote>{error}</ErrorNote>}
          <fieldset>
            <legend className="text-[15px] font-semibold">Toca el tipo que más se parece</legend>
            <div className="mt-2 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {categories.map((c) => {
                const Icon = ICONS[c.slug] ?? Store;
                const active = category === c.slug;
                return (
                  <button
                    key={c.slug}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setCategory(c.slug)}
                    className={cn('flex min-h-[96px] flex-col items-start justify-between gap-3 rounded-[18px] border-2 p-4 text-left transition', active ? 'border-brand bg-brand-soft' : 'border-transparent bg-surface shadow-[var(--shadow-card)] hover:-translate-y-0.5')}
                  >
                    <span className={cn('flex size-11 items-center justify-center rounded-[12px]', active ? 'bg-brand text-white' : 'bg-brand-soft text-brand-strong')}>
                      <Icon className="size-6" aria-hidden />
                    </span>
                    <span className="text-[16px] font-bold leading-tight">{c.name}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>
          <Field label="Nombre del negocio" hint="Como lo conoce la gente. Por ejemplo: «Colmado Don Pedro».">
            {(a) => <Input {...a} value={name} maxLength={120} autoComplete="organization" onChange={(e) => setName(e.target.value)} />}
          </Field>
          <Button size="lg" disabled={!category || !nameOk} onClick={() => { setError(null); setStep(2); }}>Seguir</Button>
        </section>
      )}

      {step === 2 && (
        <section className="flex flex-col px-4 pb-8 pt-5">
          <StepTitle headingRef={heading} title="¿Dónde está?" hint="Mueve el mapa hasta que el pin rojo quede sobre la puerta del negocio." />
          {error && <div className="mt-3"><ErrorNote>{error}</ErrorNote></div>}
          <LocationPicker onChange={setPoint} initial={point} ariaLabel="Mapa para marcar dónde está el negocio" />
          <Button size="lg" className="mt-5" disabled={!point} onClick={() => { setError(null); setStep(3); }}>El pin está en el negocio</Button>
        </section>
      )}

      {step === 3 && (
        <section className="flex flex-col gap-5 px-4 pb-8 pt-5">
          <StepTitle headingRef={heading} title="¿Cómo te contactan?" hint="Todo es opcional, pero ayuda a que te encuentren." />
          {error && <ErrorNote>{error}</ErrorNote>}
          <Field label="WhatsApp" optional hint="Con este número la gente te escribe directo desde el mapa.">
            {(a) => <Input {...a} type="tel" inputMode="tel" autoComplete="tel" value={contact.whatsapp} maxLength={20} placeholder="809 555 1234" onChange={setField('whatsapp')} />}
          </Field>
          <Field label="Teléfono" optional>
            {(a) => <Input {...a} type="tel" inputMode="tel" value={contact.phone} maxLength={20} placeholder="809 555 1234" onChange={setField('phone')} />}
          </Field>
          <Field label="Dirección" optional hint="Calle, número o una referencia: «frente al parque».">
            {(a) => <Input {...a} value={contact.address} maxLength={200} autoComplete="street-address" onChange={setField('address')} />}
          </Field>
          <Field label="¿Qué ofreces?" optional hint="Productos, servicios o lo que te hace especial.">
            {(a) => <Textarea {...a} value={contact.description} maxLength={2000} onChange={setField('description')} />}
          </Field>
          <details className="rounded-[14px] bg-surface p-4 shadow-[var(--shadow-card)]">
            <summary className="cursor-pointer font-semibold">Correo y página web</summary>
            <div className="mt-4 flex flex-col gap-5">
              <Field label="Correo" optional>{(a) => <Input {...a} type="email" autoComplete="email" value={contact.email} maxLength={254} onChange={setField('email')} />}</Field>
              <Field label="Página web" optional hint="Debe empezar por https://">{(a) => <Input {...a} type="url" value={contact.website} maxLength={300} placeholder="https://" onChange={setField('website')} />}</Field>
            </div>
          </details>
          <PhotoPicker state={photos} hint="La fachada y tus productos ayudan a que te reconozcan." />
          <Button size="lg" onClick={submit} loading={busy}>Registrar mi negocio</Button>
          <p className="text-center text-sm text-muted">Es gratis. El municipio revisa cada negocio antes de publicarlo.</p>
        </section>
      )}
    </div>
  );
}
