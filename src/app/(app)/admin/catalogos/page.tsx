import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { listCatalogs, type CatalogKey } from '@/modules/admin/server';
import { Eyebrow, Notice } from '@/components/ui/primitives';
import { requireStaff } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { cn } from '@/utils/cn';
import { CatalogEditor } from './catalog-editor';

export const metadata: Metadata = { title: 'Catálogos' };

const TABS: { id: string; key: CatalogKey; label: string; hint: string }[] = [
  { id: 'transito', key: 'traffic_types', label: 'Tránsito', hint: 'Los tipos de alerta que los vecinos eligen al reportar en el mapa. La duración es cuánto tiempo se muestra la alerta si nadie la cierra.' },
  { id: 'reportes', key: 'request_categories', label: 'Reportes al municipio', hint: 'Problemas (basura, alumbrado…) y consultas que los vecinos envían al ayuntamiento.' },
  { id: 'negocios', key: 'business_categories', label: 'Negocios', hint: 'Las categorías que eligen los comercios al registrarse y que filtran el mapa.' },
];

// Catálogos editables sin deploy (§8.5): valen para toda la provincia, por eso solo los edita la administración provincial.
export default async function CatalogsPage({ searchParams }: { searchParams: Promise<{ que?: string }> }) {
  const viewer = await requireStaff('/admin/catalogos');
  if (!viewer.isProvincialAdmin) redirect('/admin');
  const { que } = await searchParams;
  const tab = TABS.find((t) => t.id === que) ?? TABS[0]!;
  const lists = await listCatalogs(await createClient());
  if (!lists) redirect('/admin');

  return (
    <>
      <header className="mb-5">
        <Eyebrow>Gestión provincial</Eyebrow>
        <h1 className="text-[28px] font-extrabold md:text-[34px]">Catálogos</h1>
        <p className="mt-1 text-[16px] text-muted">Las listas que ven los vecinos en los formularios. Los cambios se ven en la app al momento, sin ayuda técnica.</p>
      </header>
      <nav aria-label="Catálogo" className="mb-4 flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <Link key={t.id} href={`/admin/catalogos?que=${t.id}`} aria-current={t.id === tab.id ? 'true' : undefined} className={cn('rounded-full px-3.5 py-2 text-[15px] font-semibold', t.id === tab.id ? 'bg-ink text-white' : 'bg-surface text-muted shadow-[var(--shadow-card)] hover:text-ink')}>
            {t.label} <span className="opacity-70">({lists[t.key].length})</span>
          </Link>
        ))}
      </nav>
      <p className="mb-4 text-[15px] text-muted">{tab.hint}</p>
      <CatalogEditor key={tab.key} catalog={tab.key} items={lists[tab.key]} />
      <div className="mt-4">
        <Notice tone="neutral">
          Nada se borra: lo que ya usan reportes o negocios se <strong>desactiva</strong> y deja de ofrecerse, pero el historial lo conserva. Siempre queda al menos una opción activa. Cada cambio queda en la auditoría.
        </Notice>
      </div>
    </>
  );
}
