'use client';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FileUp, MapPinPlus, Undo2, X } from 'lucide-react';
import { DIFFICULTIES, ROUTE_KINDS, parseGpx, routeProposalInput, thinPoints } from '@/modules/routes';
import type { LatLng, StaticLayers } from '@/modules/map';
import { Button } from '@/components/ui/button';
import { Field, Input, Textarea } from '@/components/ui/form';
import { ErrorNote, Notice } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { DIFFICULTY, ROUTE_KIND } from '@/lib/vocabulary';
import { distanceKm, formatDistance } from '@/utils/format';
import { LocationPicker } from '../_contenido/location-picker';
import { PhotoPicker, usePhotos } from '../_contenido/photo-picker';
import { ChoiceGrid, DoneScreen, StepTitle, WizardHeader } from '../_contenido/wizard';
import { submitRoute } from './actions';

type Kind = (typeof ROUTE_KINDS)[number];
type Difficulty = (typeof DIFFICULTIES)[number];
type Position = [number, number];

const MAX_GPX_BYTES = 5 * 1024 * 1024;

export function RouteWizard({ staff }: { staff: boolean }) {
  const toast = useToast();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState('');
  const [kind, setKind] = useState<Kind | ''>('');
  const [difficulty, setDifficulty] = useState<Difficulty | ''>('');
  const [duration, setDuration] = useState('');
  const [center, setCenter] = useState<LatLng | null>(null);
  const [points, setPoints] = useState<Position[]>([]);
  const [fromFile, setFromFile] = useState<string | null>(null);
  const [flyTo, setFlyTo] = useState<{ center: LatLng; zoom: number; key: number } | null>(null);
  const fly = (center: LatLng, zoom: number) => setFlyTo((f) => ({ center, zoom, key: (f?.key ?? 0) + 1 }));
  const [description, setDescription] = useState('');
  const photos = usePhotos(5);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ id: string; published: boolean; photoError: string | null } | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => heading.current?.focus(), [step, done]);

  const minutes = Number(duration);
  const step1Ok = name.trim().length >= 2 && !!kind && !!difficulty && Number.isInteger(minutes) && minutes >= 5 && minutes <= 2880;
  const km = useMemo(
    () => points.reduce((sum, p, i) => {
      const prev = points[i - 1];
      return prev ? sum + distanceKm({ lng: prev[0], lat: prev[1] }, { lng: p[0], lat: p[1] }) : sum;
    }, 0),
    [points],
  );

  // El trazado se dibuja con la misma capa de rutas del mapa
  const trace: StaticLayers = useMemo(() => ({
    provinceId: null,
    municipalities: { type: 'FeatureCollection', features: [] },
    routes: {
      type: 'FeatureCollection',
      features: points.length >= 2 ? [{ type: 'Feature', geometry: { type: 'LineString', coordinates: points }, properties: { id: 'nueva', title: name } }] : [],
    },
  }), [points, name]);

  function addPoint() {
    if (!center) return;
    setFromFile(null);
    // Al marcar el inicio se acerca el mapa para trazar el camino con detalle
    if (points.length === 0) fly(center, 15);
    setPoints((p) => [...p, [Number(center.lng.toFixed(6)), Number(center.lat.toFixed(6))]]);
  }

  async function loadGpx(file: File | undefined) {
    if (fileInput.current) fileInput.current.value = '';
    if (!file) return;
    if (file.size > MAX_GPX_BYTES) {
      toast.show('El archivo es muy grande (máximo 5 MB).', 'error');
      return;
    }
    const pts = thinPoints(parseGpx(await file.text()));
    if (pts.length < 2) {
      toast.show('No encontramos un recorrido en ese archivo. Usa un GPX exportado de tu aplicación de caminatas.', 'error');
      return;
    }
    setPoints(pts);
    setFromFile(file.name);
    const lngs = pts.map((p) => p[0]);
    const lats = pts.map((p) => p[1]);
    const span = Math.max(Math.max(...lngs) - Math.min(...lngs), Math.max(...lats) - Math.min(...lats), 0.002);
    fly({ lng: (Math.max(...lngs) + Math.min(...lngs)) / 2, lat: (Math.max(...lats) + Math.min(...lats)) / 2 }, Math.max(9, Math.min(16, Math.log2(360 / span) - 1.3)));
    toast.show(`Cargamos ${pts.length} puntos del recorrido.`);
  }

  async function submit() {
    setError(null);
    const parsed = routeProposalInput.safeParse({
      name, kind, difficulty, durationMin: minutes, description, geojson: { type: 'LineString', coordinates: points },
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Revisa los datos.');
      return;
    }
    setBusy(true);
    const r = await submitRoute(parsed.data);
    if (r.status === 'rejected') {
      setBusy(false);
      setError(r.message);
      if (r.reason === 'out_of_area' || r.reason === 'invalid_geometry') setStep(2);
      return;
    }
    const photoError = await photos.upload('eco_route', r.id);
    setBusy(false);
    setDone({ id: r.id, published: r.extra?.route_status === 'published', photoError });
  }

  if (done) {
    return (
      <DoneScreen
        headingRef={heading}
        title={done.published ? 'Ruta publicada' : '¡Gracias por tu propuesta!'}
        message={done.published ? 'Ya aparece en el mapa.' : 'Un moderador del municipio la revisará. Te avisaremos cuando aparezca en el mapa.'}
        photoError={done.photoError}
        primary={{ href: `/rutas/${done.id}`, label: 'Ver la ruta' }}
        secondary={{ href: '/', label: 'Volver al mapa' }}
      />
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col">
      <WizardHeader step={step} total={3} onBack={() => setStep((s) => (s - 1) as 1 | 2)} />

      {step === 1 && (
        <section className="flex flex-col gap-5 px-4 pb-8 pt-5">
          <StepTitle headingRef={heading} title="Proponer una ruta" hint="Un sendero o recorrido para caminar, ir en bicicleta o conocer la provincia." />
          <p className="-mt-2 text-[15px]">
            ¿Es un solo sitio? <Link href="/proponer" className="font-semibold text-brand underline">Proponer un lugar</Link>
          </p>
          <Field label="Nombre de la ruta" hint="Por ejemplo: «Sendero del río Inaje».">
            {(a) => <Input {...a} value={name} maxLength={120} onChange={(e) => setName(e.target.value)} />}
          </Field>
          <ChoiceGrid legend="¿Qué tipo de ruta es?" columns={3} options={ROUTE_KINDS.map((k) => ({ value: k, label: ROUTE_KIND[k] ?? k }))} value={kind} onChange={setKind} />
          <ChoiceGrid legend="¿Qué tan difícil es?" columns={3} options={DIFFICULTIES.map((d) => ({ value: d, label: DIFFICULTY[d]?.label ?? d }))} value={difficulty} onChange={setDifficulty} />
          <Field label="¿Cuántos minutos dura?" hint="Aproximado, a paso tranquilo. Por ejemplo: 90 para hora y media.">
            {(a) => <Input {...a} type="number" inputMode="numeric" min={5} max={2880} value={duration} onChange={(e) => setDuration(e.target.value)} />}
          </Field>
          <Button size="lg" disabled={!step1Ok} onClick={() => setStep(2)}>Seguir</Button>
        </section>
      )}

      {step === 2 && (
        <section className="flex flex-col px-4 pb-8 pt-5">
          <StepTitle headingRef={heading} title="Marca el recorrido" hint="Pon el pin en el inicio y toca «Agregar este punto». Luego muévelo por el camino y repite hasta el final." />
          {error && <div className="mt-3"><ErrorNote>{error}</ErrorNote></div>}
          <LocationPicker onChange={setCenter} staticLayers={trace} flyTo={flyTo} ariaLabel="Mapa para trazar el recorrido de la ruta">
            <Button size="lg" className="flex-1" icon={<MapPinPlus className="size-5" />} onClick={addPoint} disabled={!center}>
              {points.length === 0 ? 'Agregar el inicio' : 'Agregar este punto'}
            </Button>
          </LocationPicker>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <p className="flex-1 text-[15px] font-semibold" aria-live="polite">
              {points.length === 0 ? 'Todavía no hay puntos.' : `${points.length} ${points.length === 1 ? 'punto' : 'puntos'} · ${formatDistance(km)}`}
            </p>
            {points.length > 0 && !fromFile && (
              <Button variant="ghost" icon={<Undo2 className="size-4" />} onClick={() => setPoints((p) => p.slice(0, -1))}>Deshacer</Button>
            )}
            {points.length > 0 && (
              <Button variant="ghost" icon={<X className="size-4" />} onClick={() => { setPoints([]); setFromFile(null); }}>Borrar</Button>
            )}
          </div>
          {fromFile && <Notice tone="ok">Recorrido cargado de «{fromFile}».</Notice>}
          <label className="mt-3 flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-[14px] border-2 border-dashed border-line-strong bg-surface px-4 font-semibold text-muted hover:border-brand hover:text-brand">
            <FileUp className="size-5" aria-hidden />
            ¿Grabaste el recorrido con el GPS? Sube el archivo GPX
            <input ref={fileInput} type="file" accept=".gpx,application/gpx+xml,application/xml,text/xml" className="sr-only" onChange={(e) => void loadGpx(e.target.files?.[0])} />
          </label>
          <Button size="lg" className="mt-5" disabled={points.length < 2} onClick={() => { setError(null); setStep(3); }}>
            {points.length < 2 ? 'Marca al menos 2 puntos' : 'El recorrido está listo'}
          </Button>
        </section>
      )}

      {step === 3 && (
        <section className="flex flex-col gap-5 px-4 pb-8 pt-5">
          <StepTitle headingRef={heading} title="Cuéntanos de la ruta" hint={`${name.trim()} · ${formatDistance(km)}`} />
          {error && <ErrorNote>{error}</ErrorNote>}
          <Field label="¿Qué se ve y qué hay que saber?" optional hint="Dónde empieza, qué llevar, si hay ríos que cruzar o tramos difíciles.">
            {(a) => <Textarea {...a} value={description} maxLength={3000} onChange={(e) => setDescription(e.target.value)} />}
          </Field>
          <PhotoPicker state={photos} hint="Fotos del camino ayudan a otras personas a animarse." />
          <Button size="lg" onClick={submit} loading={busy}>{staff ? 'Publicar ruta' : 'Enviar propuesta'}</Button>
          <p className="text-center text-sm text-muted">{staff ? 'Si empieza en tu municipio, se publica directamente.' : 'La distancia exacta la calcula el sistema con el trazado.'}</p>
        </section>
      )}
    </div>
  );
}
