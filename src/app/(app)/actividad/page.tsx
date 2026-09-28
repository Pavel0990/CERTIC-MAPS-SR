import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight, Inbox, ThumbsUp } from 'lucide-react';
import { getMyActivity, listPublicRequests } from '@/modules/citizen-reports/server';
import { LinkTabs, PageShell } from '@/components/shared/page';
import { RequestStatusBadge, TrafficStatusBadge } from '@/components/shared/status';
import { Card, EmptyState } from '@/components/ui/primitives';
import { requireViewer } from '@/lib/auth';
import { getLabelMaps } from '@/lib/catalogs';
import { REQUEST_STATUS, TRAFFIC_STATUS, type RequestStatus, type TrafficStatus } from '@/lib/vocabulary';
import { createClient } from '@/lib/supabase/server';
import { timeAgo } from '@/utils/format';

export const metadata: Metadata = { title: 'Mi actividad' };

export default async function ActivityPage({ searchParams }: { searchParams: Promise<{ ver?: string }> }) {
  await requireViewer('/actividad');
  const { ver } = await searchParams;
  const tab = ver === 'prioridades' ? 'prioridades' : 'mios';
  const supabase = await createClient();
  const [activity, labels, publicRequests] = await Promise.all([getMyActivity(supabase), getLabelMaps(), listPublicRequests(supabase)]);
  const voted = new Set(activity.votes);
  const mine = [
    ...activity.requests.map((r) => ({ kind: 'request' as const, id: r.id, at: r.created_at, r })),
    ...activity.traffic_reports.map((t) => ({ kind: 'traffic' as const, id: t.id, at: t.created_at, t })),
  ].sort((a, b) => b.at.localeCompare(a.at));

  return (
    <PageShell title="Mi actividad" description="Tus reportes y cómo van. Te avisamos cada vez que cambian.">
      <LinkTabs
        active={tab === 'mios' ? '/actividad' : '/actividad?ver=prioridades'}
        tabs={[
          { href: '/actividad', label: 'Mis reportes', count: mine.length },
          { href: '/actividad?ver=prioridades', label: 'Prioridades' },
        ]}
      />

      {tab === 'mios' ? (
        mine.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Inbox className="size-7" />}
              title="Todavía no has reportado nada"
              action={<Link href="/reportar" className="mt-2 inline-flex h-12 items-center rounded-[14px] bg-ink px-5 font-semibold text-white">Hacer mi primer reporte</Link>}
            >
              Cuando reportes un bache, basura o una consulta al municipio, aquí verás cómo avanza.
            </EmptyState>
          </Card>
        ) : (
          <ul className="flex flex-col gap-3">
            {mine.map((item) =>
              item.kind === 'request' ? (
                <li key={item.id}>
                  <Link href={`/consultas/${item.id}`} className="group flex items-center gap-4 rounded-[18px] bg-surface p-4 shadow-[var(--shadow-card)] transition hover:shadow-[var(--shadow-float)]">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <RequestStatusBadge status={item.r.status} />
                        <span className="text-sm text-muted">{labels.categories[item.r.category] ?? item.r.category} · {timeAgo(item.r.created_at)}</span>
                      </div>
                      <p className="mt-1.5 truncate text-[17px] font-bold">{item.r.title}</p>
                      <p className="text-[15px] text-muted">{REQUEST_STATUS[item.r.status as RequestStatus]?.explain}</p>
                    </div>
                    <ChevronRight className="size-5 shrink-0 text-subtle transition group-hover:translate-x-0.5" aria-hidden />
                  </Link>
                </li>
              ) : (
                <li key={item.id} className="flex items-center gap-4 rounded-[18px] bg-surface p-4 shadow-[var(--shadow-card)]">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <TrafficStatusBadge status={item.t.status} />
                      <span className="text-sm text-muted">Alerta vial · {timeAgo(item.t.created_at)}</span>
                    </div>
                    <p className="mt-1.5 text-[17px] font-bold">{labels.trafficTypes[item.t.type] ?? item.t.type}</p>
                    <p className="text-[15px] text-muted">{TRAFFIC_STATUS[item.t.status as TrafficStatus]?.explain}</p>
                  </div>
                </li>
              ),
            )}
          </ul>
        )
      ) : (
        <>
          <p className="mb-4 text-[16px] text-muted">
            Apoya los problemas que más te afectan. El municipio ve cuántos vecinos apoyan cada uno.
          </p>
          {publicRequests.length === 0 ? (
            <Card><EmptyState title="No hay reportes para apoyar todavía">Cuando el municipio apruebe reportes públicos, aparecerán aquí.</EmptyState></Card>
          ) : (
            <ul className="flex flex-col gap-3">
              {publicRequests.map((r) => (
                <li key={r.id}>
                  <Link href={`/consultas/${r.id}`} className="group flex items-center gap-4 rounded-[18px] bg-surface p-4 shadow-[var(--shadow-card)] transition hover:shadow-[var(--shadow-float)]">
                    <div className="flex w-14 shrink-0 flex-col items-center rounded-[12px] bg-brand-soft py-2 text-brand-strong">
                      <ThumbsUp className="size-4" aria-hidden />
                      <span className="text-lg font-extrabold">{r.support_count}</span>
                      <span className="sr-only">apoyos</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <RequestStatusBadge status={r.status} />
                        {voted.has(r.id) && <span className="text-sm font-semibold text-brand">Lo apoyas</span>}
                      </div>
                      <p className="mt-1 truncate text-[17px] font-bold">{r.title}</p>
                      <p className="text-sm text-muted">{labels.categories[r.category] ?? r.category}</p>
                    </div>
                    <ChevronRight className="size-5 shrink-0 text-subtle" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </PageShell>
  );
}
