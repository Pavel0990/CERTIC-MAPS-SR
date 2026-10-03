import { AppNav } from '@/components/shared/app-nav';
import { getViewer } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { OutboxSync } from './_components/outbox-sync';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();
  let unread = 0;
  if (viewer) {
    const supabase = await createClient();
    const { count } = await supabase.from('notifications').select('id', { count: 'exact', head: true }).is('read_at', null);
    unread = count ?? 0;
  }
  return (
    <div className="min-h-dvh md:pl-[88px]">
      {viewer && <OutboxSync />}
      <AppNav signedIn={!!viewer} isStaff={!!viewer?.isStaff} isEntrepreneur={!!viewer?.isEntrepreneur} unread={unread} />
      <main id="contenido" className="pb-[calc(68px+env(safe-area-inset-bottom))] md:pb-0">
        {children}
      </main>
    </div>
  );
}
