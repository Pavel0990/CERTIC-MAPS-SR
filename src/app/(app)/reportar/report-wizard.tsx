'use client';
import { useEffect, useRef, useState } from 'react';
import { Check, CircleAlert, LocateFixed, MessageCircleQuestion, Siren, type LucideIcon } from 'lucide-react';
import { MapCanvas, type LatLng } from '@/modules/map';
import { uploadPhotos } from '@/modules/media';
import { catalogIcon } from '@/components/shared/catalog-icon';
import { Button } from '@/components/ui/button';
import { Field, Input, Select, Textarea } from '@/components/ui/form';
import { ErrorNote } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { GEO_MESSAGE, useGeolocation } from '@/hooks/use-geolocation';
import { PROVINCE_VIEW } from '@/config/env';
import { sendOrQueue, type SendResult } from '@/lib/outbox';
import { SEVERITY, reasonMessage } from '@/lib/vocabulary';
import { cn } from '@/utils/cn';
import { PhotoPicker, usePhotos } from '../_contenido/photo-picker';
import { DoneScreen, StepTitle, WizardHeader } from '../_contenido/wizard';

export interface ReportCatalogs {
  trafficTypes: { code: string; name: string; icon: string; default_severity: number }[];
  requestCategories: { code: string; kind: 'incident' | 'inquiry'; name: string; icon: string }[];
  municipalities: { id: string; name: string }[];
}

type Choice =
  | { flow: 'traffic'; code: string; name: string; severity: number }
  | { flow: 'request'; kind: 'incident' | 'inquiry'; code: string; name: string };

const MAX_PHOTOS = 3;
const newKey = () => crypto.randomUUID().replace(/-/g, '');

export function ReportWizard({ catalogs, initialType }: { catalogs: ReportCatalogs; initialType?: string }) {
  const toast = useToast();
  const { state: geo, locate } = useGeolocation();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [choice, setChoice] = useState<Choice | null>(null);
  const [point, setPoint] = useState<LatLng | null>(null);
  const [noPlace, setNoPlace] = useState(false);
  const [municipalityId, setMunicipalityId] = useState('');
  const [severity, setSeverity] = useState(2);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const photos = usePhotos(MAX_PHOTOS);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SendResult | null>(null);
  const [focus, setFocus] = useState<{ center: LatLng; zoom?: number; key: number } | null>(null);
  const [key] = useState(newKey); // misma clave en todos los reintentos de este reporte
  const heading = useRef<HTMLHeadingElement>(null);

  // Tipo preseleccionado desde un enlace (p. ej. /reportar?tipo=bache)
  useEffect(() => {
    if (!initialType) return;
    const t = catalogs.trafficTypes.find((x) => x.code === initialType);
    if (t) pick({ flow: 'traffic', code: t.code, name: t.name, severity: t.default_severity });
    // Solo al abrir la página
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Llevar el foco al título de cada paso (lectores de pantalla y teclado)
  useEffect(() => heading.current?.focus(), [step, result]);

  const traffic = catalogs.trafficTypes;
  const incidents = catalogs.requestCategories.filter((c) => c.kind === 'incident');
  const inquiries = catalogs.requestCategories.filter((c) => c.kind === 'inquiry');
  const isInquiry = choice?.flow === 'request' && choice.kind === 'inquiry';

  function pick(c: Choice) {
    setChoice(c);
    if (c.flow === 'traffic') setSeverity(c.severity);
    if (c.flow === 'request') setTitle(c.name);
    setStep(2);
  }

  async function useMyLocation() {
    const s = await locate();
    if (s.status === 'ok') {
      setFocus((f) => ({ center: { lat: s.lat, lng: s.lng }, zoom: 17, key: (f?.key ?? 0) + 1 }));
      setPoint({ lat: s.lat, lng: s.lng });
    } else if (s.status !== 'idle' && s.status !== 'locating') toast.show(GEO_MESSAGE[s.status], 'error');
  }

  const locationOk = noPlace ? !!municipalityId : !!point;
  const detailsOk = choice?.flow === 'traffic' || (title.trim().length >= 3 && description.trim().length >= 10);

  async function submit() {
    if (!choice) return;
    setBusy(true);
    setError(null);
    const payload =
      choice.flow === 'traffic'
        ? { type: choice.code, lat: point!.lat, lng: point!.lng, severity, description: description.trim() || undefined }
        : {
            kind: choice.kind, category: choice.code, title: title.trim(), description: description.trim(),
            ...(noPlace ? { municipalityId } : { lat: point!.lat, lng: point!.lng }),
          };
    const r = await sendOrQueue(
      { id: key, kind: choice.flow, payload, photos: photos.photos.map((p) => p.blob) },
      (entity, id, blobs) => uploadPhotos(entity, id, blobs),
    );
    setBusy(false);
    if (r.outcome === 'rejected') {
      setError(reasonMessage(r.reason));
      if (['out_of_area', 'invalid_coordinates', 'location_required'].includes(r.reason)) setStep(2);
      return;
    }
    setResult(r);
  }

  if (result) return <Done result={result} flow={choice!.flow} headingRef={heading} />;

  return (
    <div className="mx-auto flex max-w-2xl flex-col">
      {/* Progreso: 3 pasos, una decisión por pantalla (§6.2) */}
      <WizardHeader step={step} total={3} onBack={() => setStep((s) => (s - 1) as 1 | 2)} cancelHref="/" cancelLabel="Cancelar y volver al inicio" />

      {step === 1 && (
        <section className="px-4 pb-8 pt-5">
          <StepTitle headingRef={heading} title="¿Qué pasó?" hint="Toca lo que más se parece." />
          <Group title="En la calle o la carretera" hint="Sale en el mapa para avisar a todos y se quita sola cuando vence.">
            {traffic.map((t) => (
              <Tile key={t.code} icon={catalogIcon(t.icon, Siren)} label={t.name} tone="danger" onClick={() => pick({ flow: 'traffic', code: t.code, name: t.name, severity: t.default_severity })} />
            ))}
          </Group>
          <Group title="Un problema para el municipio" hint="Lo atiende el ayuntamiento y puedes seguir su avance.">
            {incidents.map((c) => (
              <Tile key={c.code} icon={catalogIcon(c.icon, CircleAlert)} label={c.name} tone="brand" onClick={() => pick({ flow: 'request', kind: 'incident', code: c.code, name: c.name })} />
            ))}
          </Group>
          <Group title="Una consulta, queja o propuesta" hint="No hace falta que sea en un lugar.">
            {inquiries.map((c) => (
              <Tile key={c.code} icon={catalogIcon(c.icon, MessageCircleQuestion)} label={c.name} tone="violet" onClick={() => pick({ flow: 'request', kind: 'inquiry', code: c.code, name: c.name })} />
            ))}
          </Group>
        </section>
      )}

      {step === 2 && choice && (
        <section className="flex flex-col px-4 pb-8 pt-5">
          <StepTitle headingRef={heading} title="¿Dónde es?" hint="Mueve el mapa hasta que el pin rojo quede sobre el lugar." />
          {error && <div className="mt-3"><ErrorNote>{error}</ErrorNote></div>}
          {isInquiry && (
            <label className="mt-4 flex items-center gap-3 rounded-[14px] bg-surface p-4 shadow-[var(--shadow-card)]">
              <input type="checkbox" checked={noPlace} onChange={(e) => setNoPlace(e.target.checked)} className="size-6 accent-[#2f6feb]" />
              <span className="text-[16px] font-semibold">No es en un lugar específico</span>
            </label>
          )}
          {noPlace ? (
            <div className="mt-4">
              <Field label="¿De qué municipio es?">
                {(a) => (
                  <Select {...a} value={municipalityId} onChange={(e) => setMunicipalityId(e.target.value)}>
                    <option value="">Elige el municipio</option>
                    {catalogs.municipalities.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </Select>
                )}
              </Field>
            </div>
          ) : (
            <>
              <div className="relative mt-4 h-[52dvh] min-h-[320px] overflow-hidden rounded-[20px] shadow-[var(--shadow-card)]">
                <MapCanvas
                  className="absolute inset-0"
                  centerPin
                  initialView={PROVINCE_VIEW}
                  focus={focus}
                  userLocation={geo.status === 'ok' ? { lat: geo.lat, lng: geo.lng } : null}
                  onMoveEnd={(v) => setPoint(v.center)}
                  ariaLabel="Mapa para marcar el lugar del reporte"
                />
              </div>
              <Button variant="soft" size="lg" className="mt-3" icon={<LocateFixed className="size-5" />} onClick={useMyLocation} loading={geo.status === 'locating'}>
                Usar mi ubicación actual
              </Button>
              {geo.status === 'ok' && geo.accuracy > 60 && (
                <p className="mt-2 text-sm text-muted">Tu ubicación tiene un margen de unos {Math.round(geo.accuracy)} m: ajusta el pin si hace falta.</p>
              )}
            </>
          )}
          <Button size="lg" className="mt-5" disabled={!locationOk} onClick={() => { setError(null); setStep(3); }}>
            {noPlace ? 'Seguir' : 'El pin está en el lugar'}
          </Button>
        </section>
      )}

      {step === 3 && choice && (
        <section className="flex flex-col gap-5 px-4 pb-8 pt-5">
          <StepTitle headingRef={heading} title="Cuéntanos más" hint={`${choice.name}${choice.flow === 'traffic' ? ' · alerta vial' : ''}`} />
          {error && <ErrorNote>{error}</ErrorNote>}

          {choice.flow === 'traffic' ? (
            <fieldset>
              <legend className="text-[15px] font-semibold">¿Qué tan grave es?</legend>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {[1, 2, 3].map((n) => (
                  <button
                    key={n}
                    type="button"
                    aria-pressed={severity === n}
                    onClick={() => setSeverity(n)}
                    className={cn('flex h-14 items-center justify-center gap-2 rounded-[14px] border-2 text-[16px] font-bold transition', severity === n ? 'border-danger bg-danger-soft text-danger-strong' : 'border-line bg-surface text-muted')}
                  >
                    {severity === n && <Check className="size-4" aria-hidden />}
                    {SEVERITY[n]?.label}
                  </button>
                ))}
              </div>
            </fieldset>
          ) : (
            <Field label="Título" hint="Una frase corta. Ya pusimos una sugerencia.">
              {(a) => <Input {...a} value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} />}
            </Field>
          )}

          <Field
            label={choice.flow === 'traffic' ? '¿Algo más que debamos saber?' : 'Describe el problema'}
            optional={choice.flow === 'traffic'}
            hint={choice.flow === 'traffic' ? 'Por ejemplo: «ocupa un carril».' : 'Por ejemplo: «el poste lleva una semana apagado y la calle queda oscura».'}
            error={choice.flow === 'request' && description.length > 0 && description.trim().length < 10 ? 'Escribe al menos 10 letras.' : undefined}
          >
            {(a) => <Textarea {...a} value={description} maxLength={choice.flow === 'traffic' ? 500 : 2000} onChange={(e) => setDescription(e.target.value)} />}
          </Field>

          <PhotoPicker state={photos} hint="Ayudan a entender el problema." capture="environment" />

          <Button size="lg" onClick={submit} loading={busy} disabled={!detailsOk}>
            Enviar reporte
          </Button>
          <p className="text-center text-sm text-muted">Tu nombre no aparece en el mapa público.</p>
        </section>
      )}
    </div>
  );
}

function Group({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="mt-6">
      <h2 className="text-lg font-bold">{title}</h2>
      <p className="text-[15px] text-muted">{hint}</p>
      <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3">{children}</div>
    </div>
  );
}

function Tile({ icon: Icon, label, tone, onClick }: { icon: LucideIcon; label: string; tone: 'danger' | 'brand' | 'violet'; onClick: () => void }) {
  const tones = { danger: 'bg-danger-soft text-danger-strong', brand: 'bg-brand-soft text-brand-strong', violet: 'bg-violet-soft text-violet' };
  return (
    <button type="button" onClick={onClick} className="flex min-h-[104px] flex-col items-start justify-between gap-3 rounded-[18px] bg-surface p-4 text-left shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-float)]">
      <span className={cn('flex size-11 items-center justify-center rounded-[12px]', tones[tone])}>
        <Icon className="size-6" aria-hidden />
      </span>
      <span className="text-[16px] font-bold leading-tight">{label}</span>
    </button>
  );
}

function Done({ result, flow, headingRef }: { result: SendResult; flow: 'traffic' | 'request'; headingRef: React.RefObject<HTMLHeadingElement | null> }) {
  const queued = result.outcome === 'queued' || result.outcome === 'needs_login';
  const sent = result.outcome === 'sent' ? result : null;
  const published = sent?.response.report_status === 'active';
  const message =
    result.outcome === 'queued' ? 'Lo guardamos en tu teléfono. Se enviará solo cuando vuelva la señal.'
    : result.outcome === 'needs_login' ? 'Tu sesión venció. Entra de nuevo y lo enviaremos.'
    : flow === 'traffic' ? (published ? 'Ya aparece en el mapa para avisar a todos.' : 'Un moderador lo confirmará pronto y aparecerá en el mapa.')
    : 'El municipio lo recibió. Te avisaremos cada vez que cambie su estado.';
  const primary =
    result.outcome === 'needs_login' ? { href: '/entrar?next=/actividad', label: 'Entrar' }
    : sent && flow === 'request' ? { href: `/consultas/${sent.entityId}`, label: 'Ver cómo va' }
    : { href: '/actividad', label: 'Ver mis reportes' };
  return (
    <DoneScreen
      headingRef={headingRef}
      queued={queued}
      title={queued ? 'Reporte guardado' : '¡Gracias! Reporte enviado'}
      message={message}
      photoError={sent && sent.photoErrors.length > 0 ? reasonMessage(sent.photoErrors[0]) : null}
      primary={primary}
      secondary={{ href: '/', label: 'Volver al mapa' }}
    />
  );
}
