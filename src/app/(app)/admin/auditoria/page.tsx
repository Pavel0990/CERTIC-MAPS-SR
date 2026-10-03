import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { listAudit } from '@/modules/admin/server';
import { Badge, Card, Eyebrow } from '@/components/ui/primitives';
import { requireStaff } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { cn } from '@/utils/cn';
import { formatDateTime } from '@/utils/format';

export const metadata: Metadata = { title: 'Auditoría' };

const GROUPS = [
  { id: '', label: 'Todo' },
  { id: 'role', label: 'Roles' },
  { id: 'request', label: 'Reportes' },
  { id: 'traffic', label: 'Tránsito' },
  { id: 'content', label: 'Revisiones' },
  { id: 'business', label: 'Negocios' },
  { id: 'report', label: 'Informes' },
  { id: 'account', label: 'Cuentas' },
];

/** Traduce la acción técnica (p. ej. "request.status_change") a una frase. */
function describe(action: string) {
  // Acciones reales registradas por private.audit() en las migraciones
  const map: Record<string, string> = {
    'role.grant': 'Dio un rol', 'role.revoke': 'Quitó un rol',
    'request.status_change': 'Cambió el estado de un reporte', 'request.assign': 'Asignó un responsable', 'request.visibility': 'Cambió la visibilidad de un reporte',
    'traffic.moderate': 'Moderó una alerta de tránsito', 'traffic.escalate': 'Pasó una alerta a obra municipal',
    'content.review': 'Revisó contenido', 'business.submit': 'Registró un negocio', 'business.update': 'Editó un negocio', 'business.hours': 'Cambió un horario',
    'place.update': 'Editó un lugar', 'route.update': 'Editó una ruta',
    'report.begin': 'Generó un informe', 'report.download': 'Descargó un informe', 'account.delete': 'Se eliminó una cuenta',
  };
  return map[action] ?? action;
}

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ tipo?: string }> }) {
  const viewer = await requireStaff('/admin/auditoria');
  if (!viewer.isAdmin) redirect('/admin');
  const { tipo = '' } = await searchParams;
  const group = GROUPS.some((g) => g.id === tipo) ? tipo : '';
  const rows = await listAudit(await createClient(), { action: group || undefined, limit: 100 });
  return (
    <>
      <header className="mb-5">
        <Eyebrow>Gestión municipal</Eyebrow>
        <h1 className="text-[28px] font-extrabold md:text-[34px]">Auditoría</h1>
        <p className="mt-1 text-[16px] text-muted">Registro inmutable de las acciones del personal. Últimas 100.</p>
      </header>
      <nav aria-label="Tipo de acción" className="mb-4 flex flex-wrap gap-1.5">
        {GROUPS.map((g) => (
          <Link key={g.id} href={g.id ? `/admin/auditoria?tipo=${g.id}` : '/admin/auditoria'} aria-current={group === g.id ? 'true' : undefined} className={cn('rounded-full px-3 py-1.5 text-sm font-semibold', group === g.id ? 'bg-ink text-white' : 'bg-surface text-muted shadow-[var(--shadow-card)] hover:text-ink')}>
            {g.label}
          </Link>
        ))}
      </nav>
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-[15px]">
          <thead className="border-b border-line text-sm text-muted">
            <tr>
              <th scope="col" className="px-5 py-3 font-semibold">Cuándo</th>
              <th scope="col" className="px-5 py-3 font-semibold">Quién</th>
              <th scope="col" className="px-5 py-3 font-semibold">Qué hizo</th>
              <th scope="col" className="px-5 py-3 font-semibold">Resultado</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={4} className="px-5 py-8 text-center text-muted">No hay acciones registradas con este filtro.</td></tr>
            )}
            {rows.map((r) => (
              <tr key={`${r.created_at}-${r.id}`} className="border-b border-line last:border-0">
                <td className="whitespace-nowrap px-5 py-3 text-muted">{formatDateTime(r.created_at)}</td>
                <td className="px-5 py-3"><span className="font-semibold">{r.actor_name}</span><span className="block text-sm text-muted">{r.actor_role}</span></td>
                <td className="px-5 py-3">{describe(r.action)}</td>
                <td className="px-5 py-3"><Badge tone={r.result === 'success' ? 'ok' : r.result === 'denied' ? 'warn' : 'danger'}>{r.result === 'success' ? 'Hecho' : r.result === 'denied' ? 'Denegado' : 'Error'}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
