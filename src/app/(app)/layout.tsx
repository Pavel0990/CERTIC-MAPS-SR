import { AppNav } from '@/components/shared/app-nav';
import { countUnread } from '@/modules/notifications/server';
import { getViewer } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { OutboxSync } from './_components/outbox-sync';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();
  const unread = viewer ? await countUnread(await createClient()) : 0;
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
