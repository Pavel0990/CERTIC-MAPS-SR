import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ChevronRight, Store } from 'lucide-react';
import { listMyBusinesses } from '@/modules/businesses/server';
import { PageShell } from '@/components/shared/page';
import { Badge, Card, EmptyState } from '@/components/ui/primitives';
import { requireViewer } from '@/lib/auth';
import { CONTENT_STATUS, type ContentStatus } from '@/lib/vocabulary';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Mi negocio' };

export default async function MyBusinessesPage() {
  const viewer = await requireViewer('/negocio');
  const businesses = await listMyBusinesses(await createClient(), viewer.id);
  if (businesses.length === 1 && businesses[0]) redirect(`/negocio/${businesses[0].id}`);

  return (
    <PageShell title="Mi negocio" description="Administra los datos, el horario y las promociones de tus negocios.">
      {businesses.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Store className="size-7" />}
            title="Todavía no tienes un negocio registrado"
            action={<Link href="/negocios/registrar" className="inline-flex min-h-[52px] items-center rounded-[14px] bg-brand px-5 font-semibold text-white hover:bg-brand-strong">Registrar mi negocio</Link>}
          >
            Regístralo gratis para que aparezca en el mapa de la provincia.
          </EmptyState>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <ul>
            {businesses.map((b) => {
              const s = CONTENT_STATUS[b.status as ContentStatus];
              return (
                <li key={b.id} className="border-b border-line last:border-0">
                  <Link href={`/negocio/${b.id}`} className="flex items-center gap-3 px-5 py-4 hover:bg-[#fafbfc]">
                    <span className="flex size-10 items-center justify-center rounded-full bg-brand-soft text-brand" aria-hidden><Store className="size-5" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{b.name}</span>
                      {s && <Badge tone={s.tone} className="mt-1">{s.label}</Badge>}
                    </span>
                    <ChevronRight className="size-4 text-subtle" aria-hidden />
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
      {businesses.length > 0 && (
        <Link href="/negocios/registrar" className="mt-4 inline-flex h-12 items-center justify-center rounded-[14px] px-4 font-semibold text-brand hover:bg-surface">
          Registrar otro negocio
        </Link>
      )}
    </PageShell>
  );
}
