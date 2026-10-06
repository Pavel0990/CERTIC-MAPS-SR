import { requireStaff } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { AdminNav } from './_components/admin-nav';

// Panel municipal (§9.7). El layout verifica el rol; cada acción y cada RPC lo vuelven a verificar.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireStaff('/admin');
  const supabase = await createClient();
  const [traffic, requests, biz, places, routes, promos] = await Promise.all([
    supabase.from('traffic_reports').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('citizen_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('businesses').select('id', { count: 'exact', head: true }).in('status', ['pending', 'under_review']),
    supabase.from('tourism_places').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('eco_routes').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('promotions').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
  ]);
  const counts = {
    inbox: (traffic.count ?? 0) + (requests.count ?? 0),
    validations: (biz.count ?? 0) + (places.count ?? 0) + (routes.count ?? 0) + (promos.count ?? 0),
  };
  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-10 pt-5 md:px-8 md:pt-8">
      <AdminNav isAdmin={viewer.isAdmin} isProvincialAdmin={viewer.isProvincialAdmin} counts={counts} />
      {children}
    </div>
  );
}
