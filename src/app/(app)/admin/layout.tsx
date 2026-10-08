import { getPanelCounts } from '@/modules/admin/server';
import { requireStaff } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { AdminNav } from './_components/admin-nav';

// Panel municipal (§9.7). El layout verifica el rol; cada acción y cada RPC lo vuelven a verificar.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireStaff('/admin');
  const c = await getPanelCounts(await createClient());
  const counts = { inbox: c.trafficPending + c.requestsPending, validations: c.validations };
  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-10 pt-5 md:px-8 md:pt-8">
      <AdminNav isAdmin={viewer.isAdmin} isProvincialAdmin={viewer.isProvincialAdmin} counts={counts} />
      {children}
    </div>
  );
}
