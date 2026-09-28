import { Check, X } from 'lucide-react';
import { Badge } from '@/components/ui/primitives';
import { CONTENT_STATUS, REQUEST_FLOW, REQUEST_STATUS, TRAFFIC_STATUS, type ContentStatus, type RequestStatus, type TrafficStatus } from '@/lib/vocabulary';
import { cn } from '@/utils/cn';
import { formatDateTime } from '@/utils/format';

export function RequestStatusBadge({ status }: { status: string }) {
  const s = REQUEST_STATUS[status as RequestStatus] ?? REQUEST_STATUS.pending;
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

export function TrafficStatusBadge({ status }: { status: string }) {
  const s = TRAFFIC_STATUS[status as TrafficStatus] ?? TRAFFIC_STATUS.pending;
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

export function ContentStatusBadge({ status }: { status: string }) {
  const s = CONTENT_STATUS[status as ContentStatus] ?? CONTENT_STATUS.pending;
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

interface HistoryItem { to_status: string; note: string | null; created_at: string }

/**
 * Línea de tiempo del seguimiento (F5 "den seguimiento"): los 5 pasos del camino normal,
 * con fecha en los alcanzados, o el cierre "No procede" con su motivo.
 */
export function RequestTimeline({ status, history, rejectionReason }: { status: string; history: HistoryItem[]; rejectionReason?: string | null }) {
  const reached = new Map(history.map((h) => [h.to_status, h]));
  const rejected = status === 'rejected';
  const currentIndex = REQUEST_FLOW.indexOf((status === 'archived' ? 'resolved' : status) as RequestStatus);
  const steps = rejected ? REQUEST_FLOW.filter((s) => reached.has(s)) : REQUEST_FLOW;
  return (
    <ol className="flex flex-col">
      {steps.map((s, i) => {
        const h = reached.get(s);
        const done = rejected ? true : i <= currentIndex;
        const current = !rejected && i === currentIndex;
        const last = i === steps.length - 1 && !rejected;
        return (
          <li key={s} className="relative flex gap-3 pb-5 last:pb-0">
            {!last && <span className={cn('absolute left-[15px] top-8 h-[calc(100%-24px)] w-0.5', done && i < currentIndex ? 'bg-brand' : 'bg-line-strong')} aria-hidden />}
            <span className={cn('relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border-2', done ? 'border-brand bg-brand text-white' : 'border-line-strong bg-surface text-subtle', current && 'ring-4 ring-brand/20')}>
              {done ? <Check className="size-4" aria-hidden /> : <span className="text-sm font-bold">{i + 1}</span>}
            </span>
            <div className="min-w-0 pt-1">
              <p className={cn('font-semibold', !done && 'text-subtle')}>
                {REQUEST_STATUS[s].label}
                {current && <span className="sr-only"> (estado actual)</span>}
              </p>
              {h ? (
                <p className="text-sm text-muted">{formatDateTime(h.created_at)}{h.note ? ` · ${h.note}` : ''}</p>
              ) : current || !done ? (
                <p className="text-sm text-subtle">{current ? REQUEST_STATUS[s].explain : 'Pendiente'}</p>
              ) : null}
            </div>
          </li>
        );
      })}
      {rejected && (
        <li className="flex gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-danger text-white"><X className="size-4" aria-hidden /></span>
          <div className="pt-1">
            <p className="font-semibold text-danger-strong">{REQUEST_STATUS.rejected.label}</p>
            {rejectionReason && <p className="text-sm text-muted">Motivo: {rejectionReason}</p>}
          </div>
        </li>
      )}
    </ol>
  );
}
