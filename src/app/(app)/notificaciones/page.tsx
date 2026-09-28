import type { Metadata } from 'next';
import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { Bell, BellRing, CheckCheck, ChevronRight } from 'lucide-react';
import { listNotifications, markAllRead } from '@/modules/notifications/server';
import { PageShell } from '@/components/shared/page';
import { Button } from '@/components/ui/button';
import { Card, EmptyState } from '@/components/ui/primitives';
import { requireViewer } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { cn } from '@/utils/cn';
import { timeAgo } from '@/utils/format';

export const metadata: Metadata = { title: 'Notificaciones' };

async function markAll() {
  'use server';
  await markAllRead(await createClient());
  revalidatePath('/', 'layout');
}

export default async function NotificationsPage() {
  await requireViewer('/notificaciones');
  const items = await listNotifications(await createClient());
  const unread = items.filter((n) => !n.read).length;
  return (
    <PageShell
      back={{ href: '/perfil', label: 'Perfil' }}
      title="Notificaciones"
      description={unread ? `${unread} sin leer` : 'Estás al día.'}
      actions={
        unread > 0 && (
          <form action={markAll}>
            <Button type="submit" variant="secondary" size="sm" icon={<CheckCheck className="size-4" />}>Marcar todo como leído</Button>
          </form>
        )
      }
    >
      {items.length === 0 ? (
        <Card><EmptyState icon={<Bell className="size-7" />} title="No tienes notificaciones">Aquí te avisaremos cuando cambie el estado de tus reportes o haya alertas en tu municipio.</EmptyState></Card>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((n) => {
            const inner = (
              <>
                <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-full', n.read ? 'bg-canvas text-muted' : n.kind === 'traffic_nearby' ? 'bg-danger-soft text-danger-strong' : 'bg-brand-soft text-brand-strong')}>
                  <BellRing className="size-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cn('block', n.read ? 'font-medium' : 'font-bold')}>{n.title}</span>
                  {n.body && <span className="block text-[15px] text-muted">{n.body}</span>}
                  <span className="block text-sm text-subtle">{timeAgo(n.created_at)}</span>
                </span>
                {!n.read && <span className="size-2.5 shrink-0 rounded-full bg-brand" aria-label="Sin leer" />}
                {n.href && <ChevronRight className="size-4 shrink-0 text-subtle" aria-hidden />}
              </>
            );
            const cls = 'flex items-center gap-3 rounded-[16px] bg-surface p-4 shadow-[var(--shadow-card)]';
            return <li key={n.id}>{n.href ? <Link href={n.href} className={cn(cls, 'hover:bg-[#fafbfc]')}>{inner}</Link> : <div className={cls}>{inner}</div>}</li>;
          })}
        </ul>
      )}
    </PageShell>
  );
}
