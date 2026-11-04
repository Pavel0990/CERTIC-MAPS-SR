import { getPanelCounts } from '@/modules/admin/server';
import { requireStaff } from '@/lib/auth';
import { AdminNav } from './_components/admin-nav';

// Panel municipal (§9.7). El layout verifica el rol; cada acción y cada RPC lo vuelven a verificar.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireStaff('/admin');
  // Los números del menú son una ayuda: si su consulta falla, el menú sale sin ellos y el panel sigue en pie
  const c = await getPanelCounts().catch(() => null);
  const counts = { inbox: c ? c.trafficPending + c.requestsPending : 0, validations: c?.validations ?? 0 };
  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-10 pt-5 md:px-8 md:pt-8 lg:flex lg:gap-6">
      <AdminNav isAdmin={viewer.isAdmin} isProvincialAdmin={viewer.isProvincialAdmin} counts={counts} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
