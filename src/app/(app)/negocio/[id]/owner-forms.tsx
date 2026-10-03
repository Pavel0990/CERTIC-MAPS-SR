'use client';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Copy, Plus, Trash2 } from 'lucide-react';
import { promotionStartMin, type HourRange } from '@/modules/businesses';
import { Button } from '@/components/ui/button';
import { Field, Input, Textarea } from '@/components/ui/form';
import { ErrorNote } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { WEEKDAYS } from '@/lib/vocabulary';
import { PhotoPicker, usePhotos } from '../../_contenido/photo-picker';
import { addPromotion, saveBusiness, saveHours } from './actions';

function useSave() {
  const router = useRouter();
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  function run(fn: () => Promise<{ status: string; message?: string; reason?: string }>, ok: string, after?: () => void) {
    setError(null);
    start(async () => {
      const r = await fn();
      if (r.status === 'rejected') {
        setError(r.message ?? 'No se pudo guardar.');
        if (r.reason === 'version_conflict') router.refresh();
        return;
      }
      toast.show(ok);
      after?.();
      router.refresh();
    });
  }
  return { error, pending, run };
}

export interface BusinessFormValues {
  id: string;
  version: number;
  name: string;
  description: string;
  phone: string;
  whatsapp: string;
  email: string;
  website: string;
  address: string;
}

/** Datos del negocio. Un campo vacío borra el valor. */
export function BusinessForm({ initial }: { initial: BusinessFormValues }) {
  const [v, setV] = useState(initial);
  const { error, pending, run } = useSave();
  const set = (k: keyof BusinessFormValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setV((s) => ({ ...s, [k]: e.target.value }));
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        // La versión sube en cada guardado: se toma la que manda el servidor tras refrescar
        run(() => saveBusiness({ ...v, version: initial.version }), 'Guardamos los datos del negocio.');
      }}
      className="flex flex-col gap-5"
    >
      {error && <ErrorNote>{error}</ErrorNote>}
      <Field label="Nombre">{(a) => <Input {...a} value={v.name} maxLength={120} required onChange={set('name')} />}</Field>
      <Field label="¿Qué ofreces?" optional>{(a) => <Textarea {...a} value={v.description} maxLength={2000} onChange={set('description')} />}</Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="WhatsApp" optional>{(a) => <Input {...a} type="tel" inputMode="tel" value={v.whatsapp} maxLength={20} onChange={set('whatsapp')} />}</Field>
        <Field label="Teléfono" optional>{(a) => <Input {...a} type="tel" inputMode="tel" value={v.phone} maxLength={20} onChange={set('phone')} />}</Field>
      </div>
      <Field label="Dirección" optional>{(a) => <Input {...a} value={v.address} maxLength={200} onChange={set('address')} />}</Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Correo" optional>{(a) => <Input {...a} type="email" value={v.email} maxLength={254} onChange={set('email')} />}</Field>
        <Field label="Página web" optional hint="Debe empezar por https://">{(a) => <Input {...a} type="url" value={v.website} maxLength={300} onChange={set('website')} />}</Field>
      </div>
      <Button type="submit" loading={pending} className="self-start">Guardar datos</Button>
    </form>
  );
}

type DayRanges = { opens: string; closes: string }[];
const ORDER = [1, 2, 3, 4, 5, 6, 0]; // de lunes a domingo

/** Horario de la semana. Se pueden poner dos turnos el mismo día (por ejemplo, 8–12 y 2–6). */
export function HoursEditor({ businessId, initial }: { businessId: string; initial: HourRange[] }) {
  const [days, setDays] = useState<DayRanges[]>(() =>
    Array.from({ length: 7 }, (_, d) => initial.filter((h) => h.weekday === d).map(({ opens, closes }) => ({ opens, closes }))),
  );
  const { error, pending, run } = useSave();
  const update = (d: number, fn: (r: DayRanges) => DayRanges) => setDays((all) => all.map((r, i) => (i === d ? fn(r) : r)));

  function copyMonday() {
    const mon = days[1] ?? [];
    setDays((all) => all.map((r, i) => (i >= 2 && i <= 5 ? mon.map((x) => ({ ...x })) : r)));
  }

  const hours = days.flatMap((r, weekday) => r.map((x) => ({ weekday, ...x })));
  return (
    <form onSubmit={(e) => { e.preventDefault(); run(() => saveHours({ businessId, hours }), 'Guardamos el horario.'); }} className="flex flex-col gap-3">
      {error && <ErrorNote>{error}</ErrorNote>}
      <p className="text-[15px] text-muted">Si cierras después de medianoche, pon la hora de cierre normal (por ejemplo, de 8:00 p. m. a 2:00 a. m.).</p>
      <ul className="flex flex-col divide-y divide-line">
        {ORDER.map((d) => {
          const ranges = days[d] ?? [];
          const open = ranges.length > 0;
          return (
            <li key={d} className="flex flex-col gap-2 py-3">
              <div className="flex items-center justify-between gap-3">
                <label className="flex min-h-11 cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={open}
                    onChange={(e) => update(d, () => (e.target.checked ? [{ opens: '08:00', closes: '17:00' }] : []))}
                    className="size-6 accent-[#2f6feb]"
                  />
                  <span className="w-24 font-semibold">{WEEKDAYS[d]}</span>
                  {!open && <span className="text-muted">Cerrado</span>}
                </label>
                {d === 1 && open && (
                  <button type="button" onClick={copyMonday} className="inline-flex min-h-11 items-center gap-1.5 rounded-[10px] px-2 text-sm font-semibold text-brand hover:bg-brand-soft">
                    <Copy className="size-4" aria-hidden /> Igual de martes a viernes
                  </button>
                )}
              </div>
              {ranges.map((r, i) => (
                <div key={i} className="flex items-center gap-2 pl-9">
                  <label className="sr-only" htmlFor={`o-${d}-${i}`}>{WEEKDAYS[d]}: abre</label>
                  <Input id={`o-${d}-${i}`} type="time" value={r.opens} required className="max-w-36" onChange={(e) => update(d, (rs) => rs.map((x, j) => (j === i ? { ...x, opens: e.target.value } : x)))} />
                  <span aria-hidden>a</span>
                  <label className="sr-only" htmlFor={`c-${d}-${i}`}>{WEEKDAYS[d]}: cierra</label>
                  <Input id={`c-${d}-${i}`} type="time" value={r.closes} required className="max-w-36" onChange={(e) => update(d, (rs) => rs.map((x, j) => (j === i ? { ...x, closes: e.target.value } : x)))} />
                  {i > 0 && (
                    <button type="button" onClick={() => update(d, (rs) => rs.filter((_, j) => j !== i))} aria-label={`Quitar el segundo turno del ${WEEKDAYS[d]}`} className="flex size-11 items-center justify-center rounded-full text-muted hover:bg-canvas">
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </div>
              ))}
              {open && ranges.length < 2 && (
                <button type="button" onClick={() => update(d, (rs) => [...rs, { opens: '14:00', closes: '18:00' }])} className="ml-9 inline-flex min-h-11 items-center gap-1.5 self-start rounded-[10px] px-2 text-sm font-semibold text-muted hover:bg-canvas">
                  <Plus className="size-4" aria-hidden /> Agregar otro turno
                </button>
              )}
            </li>
          );
        })}
      </ul>
      <Button type="submit" loading={pending} className="self-start">Guardar horario</Button>
    </form>
  );
}

/** Nueva promoción informativa (sin códigos ni canje). Dura como mucho 90 días. */
export function PromotionForm({ businessId, approved }: { businessId: string; approved: boolean }) {
  const today = promotionStartMin();
  const empty = { title: '', description: '', validFrom: today, validUntil: today };
  const [v, setV] = useState(empty);
  const { error, pending, run } = useSave();
  if (!approved) return <p className="text-[15px] text-muted">Podrás crear promociones cuando el municipio apruebe tu negocio.</p>;
  const set = (k: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setV((s) => ({ ...s, [k]: e.target.value }));
  return (
    <form onSubmit={(e) => { e.preventDefault(); run(() => addPromotion({ businessId, ...v }), 'Enviamos la promoción. Saldrá cuando la revise un moderador.', () => setV(empty)); }} className="flex flex-col gap-4">
      {error && <ErrorNote>{error}</ErrorNote>}
      <Field label="Título" hint="Por ejemplo: «2x1 en jugos los viernes».">{(a) => <Input {...a} value={v.title} maxLength={120} required onChange={set('title')} />}</Field>
      <Field label="Detalles" optional>{(a) => <Textarea {...a} value={v.description} maxLength={500} onChange={set('description')} />}</Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Desde">{(a) => <Input {...a} type="date" min={today} value={v.validFrom} required onChange={set('validFrom')} />}</Field>
        <Field label="Hasta">{(a) => <Input {...a} type="date" min={v.validFrom} value={v.validUntil} required onChange={set('validUntil')} />}</Field>
      </div>
      <Button type="submit" loading={pending} className="self-start" icon={<Plus className="size-4" />}>Crear promoción</Button>
    </form>
  );
}

/** Agregar fotos a un negocio ya registrado. */
export function AddPhotos({ businessId, room }: { businessId: string; room: number }) {
  const router = useRouter();
  const toast = useToast();
  const photos = usePhotos(Math.max(0, room));
  const [busy, setBusy] = useState(false);
  if (room <= 0) return <p className="text-[15px] text-muted">Ya tienes el máximo de 10 fotos.</p>;
  return (
    <div className="flex flex-col gap-3">
      <PhotoPicker state={photos} hint="La fachada, el interior y tus productos." />
      {photos.photos.length > 0 && (
        <Button
          loading={busy}
          className="self-start"
          onClick={async () => {
            setBusy(true);
            const err = await photos.upload('business', businessId);
            setBusy(false);
            if (err) toast.show(err, 'error');
            else {
              toast.show('Subimos las fotos. Saldrán cuando las revise un moderador.');
              photos.photos.forEach((p) => photos.remove(p));
            }
            router.refresh();
          }}
        >
          Subir {photos.photos.length === 1 ? 'la foto' : `${photos.photos.length} fotos`}
        </Button>
      )}
    </div>
  );
}
