'use client';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { ArrowUpRight, Check, Eye, EyeOff, MapPin, ThumbsUp, UserCheck, X } from 'lucide-react';
import { RequestStatusBadge, TrafficStatusBadge } from '@/components/shared/status';
import { Badge } from '@/components/ui/primitives';
import { Select } from '@/components/ui/form';
import { useToast } from '@/components/ui/toast';
import { SEVERITY, reasonMessage } from '@/lib/vocabulary';
import { directionsUrl, timeAgo } from '@/utils/format';
import { ActionButton } from '../_components/action-button';
import { assign, changeStatus, escalateTraffic, makePublic, moderateTraffic } from '../actions';

interface TrafficProps {
  t: { id: string; type: string; severity: number; description: string | null; status: string; created_at: string; expires_at: string; point: { lat: number; lng: number } | null };
  typeName: string;
  municipality: string;
  incidentCategories: { code: string; name: string }[];
}

/** Alerta de tránsito en la bandeja. Transiciones según private.traffic_transitions. */
export function TrafficCard({ t, typeName, municipality, incidentCategories }: TrafficProps) {
  const sev = SEVERITY[t.severity] ?? SEVERITY[2]!;
  const go = (to: string, note?: string) => moderateTraffic(t.id, t.status, to, note);
  return (
    <article className="rounded-[18px] bg-surface p-4 shadow-[var(--shadow-card)]">
      <div className="flex flex-wrap items-center gap-2">
        <TrafficStatusBadge status={t.status} />
        <Badge tone={sev.tone}>Gravedad {sev.label.toLowerCase()}</Badge>
        <span className="text-sm text-muted">{municipality} · {timeAgo(t.created_at)}</span>
      </div>
      <h3 className="mt-2 text-[17px] font-bold">{typeName}</h3>
      {t.description && <p className="mt-1 text-[15px] text-muted">{t.description}</p>}
      {t.point && (
        <a href={directionsUrl(t.point.lat, t.point.lng)} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline">
          <MapPin className="size-4" aria-hidden /> Ver el lugar
        </a>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {t.status === 'pending' && <ActionButton label="Publicar en el mapa" done="Publicada. Ya la ven todos." variant="primary" icon={<Check className="size-4" />} run={() => go('active')} />}
        {t.status === 'active' && <ActionButton label="Verificar" done="Alerta verificada." variant="primary" icon={<Check className="size-4" />} run={() => go('verified')} />}
        {(t.status === 'active' || t.status === 'verified') && <ActionButton label="Ya se resolvió" done="Marcada como resuelta. Salió del mapa." run={() => go('resolved')} />}
        {['pending', 'active', 'out_of_area'].includes(t.status) && (
          <ActionButton label="Descartar" done="Alerta descartada." variant="danger" icon={<X className="size-4" />} run={(n) => go('rejected', n)} ask={{ title: 'Descartar alerta', label: 'Motivo (lo verá quien reportó)', hint: 'Por ejemplo: «no se encontró el problema».' }} />
        )}
        {['pending', 'active', 'verified'].includes(t.status) && <EscalateButton id={t.id} categories={incidentCategories} />}
      </div>
    </article>
  );
}

function EscalateButton({ id, categories }: { id: string; categories: { code: string; name: string }[] }) {
  const [category, setCategory] = useState(categories.find((c) => c.code === 'infraestructura')?.code ?? categories[0]?.code ?? '');
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="inline-flex h-9 items-center gap-1.5 rounded-[10px] px-3 text-sm font-semibold text-muted hover:bg-canvas hover:text-ink">
        <ArrowUpRight className="size-4" aria-hidden /> Pasar a obra municipal
      </button>
    );
  }
  return (
    <div className="flex w-full flex-wrap items-center gap-2 rounded-[12px] bg-canvas p-2">
      <label className="sr-only" htmlFor={`esc-${id}`}>Categoría de la obra</label>
      <Select id={`esc-${id}`} className="h-10 flex-1 text-[15px]" value={category} onChange={(e) => setCategory(e.target.value)}>
        {categories.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
      </Select>
      <button
        type="button"
        disabled={pending}
        onClick={() => start(async () => {
          const r = await escalateTraffic(id, category);
          toast.show(r.status === 'ok' ? 'Se creó un reporte para el municipio con la misma ubicación.' : reasonMessage(r.reason), r.status === 'ok' ? 'ok' : 'error');
          setOpen(false);
          router.refresh();
        })}
        className="h-10 rounded-[10px] bg-ink px-3 text-sm font-semibold text-white"
      >
        Crear reporte municipal
      </button>
      <button type="button" onClick={() => setOpen(false)} className="h-10 rounded-[10px] px-3 text-sm font-semibold text-muted">Cancelar</button>
    </div>
  );
}

interface RequestProps {
  r: {
    id: string; kind: string; title: string; description: string; status: string; is_public: boolean; support_count: number;
    created_at: string; assignee: { id: string; name: string } | null;
  };
  categoryName: string;
  municipality: string;
  staff: { user_id: string; display_name: string }[];
  viewerId: string;
  canArchive: boolean;
}

/** Reporte al municipio en la bandeja. Un paso por vez (private.request_transitions). */
export function RequestCard({ r, categoryName, municipality, staff, viewerId, canArchive }: RequestProps) {
  const go = (to: string, note?: string) => changeStatus(r.id, r.status, to, note);
  const rejectable = ['pending', 'under_review', 'approved'].includes(r.status);
  return (
    <article className="rounded-[18px] bg-surface p-4 shadow-[var(--shadow-card)]">
      <div className="flex flex-wrap items-center gap-2">
        <RequestStatusBadge status={r.status} />
        <span className="text-sm text-muted">{categoryName} · {municipality} · {timeAgo(r.created_at)}</span>
        {r.support_count > 0 && <span className="ml-auto flex items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-sm font-bold text-brand-strong"><ThumbsUp className="size-3.5" aria-hidden />{r.support_count}</span>}
      </div>
      <h3 className="mt-2 text-[17px] font-bold">
        <a href={`/consultas/${r.id}`} className="hover:underline">{r.title}</a>
      </h3>
      <p className="mt-1 line-clamp-2 text-[15px] text-muted">{r.description}</p>
      <p className="mt-2 text-sm">
        {r.assignee ? <span className="font-semibold">Responsable: {r.assignee.id === viewerId ? 'tú' : r.assignee.name}</span> : <span className="text-subtle">Sin responsable</span>}
        {r.is_public && <span className="ml-2 text-ok">· Visible en el mapa</span>}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {r.status === 'pending' && <ActionButton label="Empezar revisión" done="En revisión. Avisamos al vecino." variant="primary" run={() => go('under_review')} />}
        {r.status === 'under_review' && <ActionButton label="Aprobar" done="Aprobado. Avisamos al vecino." variant="primary" icon={<Check className="size-4" />} run={() => go('approved')} />}
        {['under_review', 'approved', 'in_progress'].includes(r.status) && <AssignControl requestId={r.id} staff={staff} current={r.assignee?.id ?? null} viewerId={viewerId} />}
        {r.status === 'approved' && (
          r.assignee
            ? <ActionButton label="Empezar el trabajo" done="En proceso. Avisamos al vecino." variant="primary" run={() => go('in_progress')} />
            : <span className="text-sm text-muted">Asigna un responsable para empezar el trabajo.</span>
        )}
        {r.status === 'in_progress' && (
          <ActionButton label="Marcar resuelto" done="Resuelto. Avisamos al vecino." variant="primary" icon={<Check className="size-4" />} run={(n) => go('resolved', n)} ask={{ title: 'Marcar como resuelto', label: 'Qué se hizo (lo verá el vecino)', hint: 'Por ejemplo: «se cambió la bombilla del poste».', required: true }} />
        )}
        {r.status === 'resolved' && canArchive && <ActionButton label="Archivar" done="Archivado." run={() => go('archived')} />}
        {rejectable && (
          <ActionButton label="No procede" done="Cerrado. Avisamos al vecino con el motivo." variant="danger" icon={<X className="size-4" />} run={(n) => go('rejected', n)} ask={{ title: 'Cerrar sin atender', label: 'Motivo (lo verá el vecino)', hint: 'Explica con palabras simples por qué no se atiende.', required: true }} />
        )}
        {['approved', 'in_progress', 'resolved'].includes(r.status) && (
          <ActionButton
            label={r.is_public ? 'Quitar del mapa' : 'Mostrar en el mapa'}
            done={r.is_public ? 'Ya no se ve en el mapa público.' : 'Ahora se ve en el mapa y los vecinos pueden apoyarlo.'}
            variant="ghost"
            icon={r.is_public ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            run={() => makePublic(r.id, !r.is_public)}
          />
        )}
      </div>
    </article>
  );
}

function AssignControl({ requestId, staff, current, viewerId }: { requestId: string; staff: { user_id: string; display_name: string }[]; current: string | null; viewerId: string }) {
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  if (!staff.length) return null;
  return (
    <div className="flex items-center gap-1.5">
      <UserCheck className="size-4 text-muted" aria-hidden />
      <label className="sr-only" htmlFor={`asg-${requestId}`}>Responsable</label>
      <Select
        id={`asg-${requestId}`}
        className="h-9 w-auto py-0 pr-9 text-sm"
        value={current ?? ''}
        disabled={pending}
        onChange={(e) => {
          const v = e.target.value;
          if (!v) return;
          start(async () => {
            const r = await assign(requestId, v);
            toast.show(r.status === 'ok' ? 'Responsable asignado.' : reasonMessage(r.reason), r.status === 'ok' ? 'ok' : 'error');
            router.refresh();
          });
        }}
      >
        <option value="">Asignar responsable…</option>
        {staff.map((s) => <option key={s.user_id} value={s.user_id}>{s.user_id === viewerId ? `${s.display_name} (tú)` : s.display_name}</option>)}
      </Select>
    </div>
  );
}
