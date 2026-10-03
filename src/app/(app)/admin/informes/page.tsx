import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { FileText } from 'lucide-react';
import { listReportRuns } from '@/modules/admin/server';
import { closedWeeks } from '@/modules/reports';
import { Card, EmptyState, Eyebrow, Notice } from '@/components/ui/primitives';
import { Badge } from '@/components/ui/primitives';
import { requireStaff } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { formatDate, formatDateTime } from '@/utils/format';
import { AutoRefresh } from '../_components/auto-refresh';
import { DownloadButton } from './download-button';
import { GenerateForm } from './generate-form';

export const metadata: Metadata = { title: 'Informes' };

const RUN_STATUS = {
  succeeded: { label: 'Listo', tone: 'ok' as const },
  running: { label: 'Generando', tone: 'warn' as const },
  failed: { label: 'Falló', tone: 'danger' as const },
};

export default async function ReportsPage() {
  const viewer = await requireStaff('/admin/informes');
  if (!viewer.isAdmin) redirect('/admin');
  const runs = await listReportRuns(await createClient());
  const generating = runs.some((r) => r.status === 'running');
  const weeks = closedWeeks(new Date()).map((monday) => {
    const sunday = new Date(`${monday}T12:00:00Z`);
    sunday.setUTCDate(sunday.getUTCDate() + 6);
    return { value: monday, label: `${formatDate(monday + 'T12:00:00')} – ${formatDate(sunday.toISOString())}` };
  });
  return (
    <>
      <header className="mb-5">
        <Eyebrow>Gestión municipal</Eyebrow>
        <h1 className="text-[28px] font-extrabold md:text-[34px]">Informes semanales</h1>
        <p className="mt-1 text-[16px] text-muted">Cada lunes se genera solo un PDF con las cifras de la semana anterior. Cada descarga queda registrada.</p>
      </header>
      {viewer.isProvincialAdmin && (
        <Card className="mb-4 p-5">
          <h2 className="mb-1 text-lg font-bold">Generar un informe</h2>
          <p className="mb-4 text-[15px] text-muted">Crea una versión nueva de una semana ya cerrada con las cifras de ahora. Las versiones anteriores se conservan.</p>
          <GenerateForm weeks={weeks} />
        </Card>
      )}
      {generating && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <Notice tone="neutral">Hay un informe generándose. La lista se actualiza sola.</Notice>
          <AutoRefresh seconds={10} />
        </div>
      )}
      {runs.length === 0 ? (
        <Card><EmptyState icon={<FileText className="size-7" />} title="Todavía no hay informes">El primero se genera solo el lunes siguiente a la publicación.</EmptyState></Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-[15px]">
            <thead className="border-b border-line text-sm text-muted">
              <tr>
                <th scope="col" className="px-5 py-3 font-semibold">Semana</th>
                <th scope="col" className="px-5 py-3 font-semibold">Versión</th>
                <th scope="col" className="px-5 py-3 font-semibold">Estado</th>
                <th scope="col" className="px-5 py-3 font-semibold">Generado</th>
                <th scope="col" className="px-5 py-3"><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => {
                const st = RUN_STATUS[r.status as keyof typeof RUN_STATUS] ?? RUN_STATUS.running;
                return (
                  <tr key={r.id} className="border-b border-line last:border-0">
                    <td className="px-5 py-3 font-semibold">{formatDate(r.period_start + 'T12:00:00')} – {formatDate(r.period_end + 'T12:00:00')}</td>
                    <td className="px-5 py-3 tabular-nums">v{r.version}{r.trigger === 'manual' ? ' · manual' : ''}</td>
                    <td className="px-5 py-3"><Badge tone={st.tone}>{st.label}</Badge></td>
                    <td className="px-5 py-3 text-muted">{r.finished_at ? formatDateTime(r.finished_at) : '—'}</td>
                    <td className="px-5 py-3 text-right">{r.status === 'succeeded' && <DownloadButton runId={r.id} />}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
