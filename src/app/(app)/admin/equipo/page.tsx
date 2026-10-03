import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { listTeam, scopeMunicipalities, searchPeople } from '@/modules/admin/server';
import { Card, Eyebrow, Notice } from '@/components/ui/primitives';
import { Badge } from '@/components/ui/primitives';
import { requireStaff } from '@/lib/auth';
import { getCatalogs } from '@/lib/catalogs';
import { createClient } from '@/lib/supabase/server';
import { GrantForm, RevokeButton } from './team-controls';

export const metadata: Metadata = { title: 'Equipo' };

export default async function TeamPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const viewer = await requireStaff('/admin/equipo');
  if (!viewer.isAdmin) redirect('/admin');
  const { q = '' } = await searchParams;
  const supabase = await createClient();
  const [team, catalogs, people] = await Promise.all([listTeam(supabase), getCatalogs(), searchPeople(supabase, q)]);
  const scope = scopeMunicipalities(catalogs.municipalities, viewer.roles);
  const muni = new Map(catalogs.municipalities.map((m) => [m.id, m.name]));

  return (
    <>
      <header className="mb-5">
        <Eyebrow>Gestión municipal</Eyebrow>
        <h1 className="text-[28px] font-extrabold md:text-[34px]">Equipo</h1>
        <p className="mt-1 text-[16px] text-muted">Quién modera y administra cada municipio. Cada cambio queda en la auditoría.</p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <Card className="overflow-hidden">
          <h2 className="border-b border-line px-5 py-4 text-lg font-bold">Personal actual</h2>
          <ul>
            {team.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-3 last:border-0">
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{t.name}{t.user_id === viewer.id ? ' (tú)' : ''}</span>
                  <span className="text-sm text-muted">{t.municipality_id ? muni.get(t.municipality_id) : 'Toda la provincia'}</span>
                </span>
                <Badge tone={t.role === 'municipal_admin' ? 'violet' : 'brand'}>{t.role === 'municipal_admin' ? 'Administración' : 'Moderación'}</Badge>
                {t.municipality_id && t.user_id !== viewer.id && (t.role === 'moderator' || viewer.isProvincialAdmin) && (
                  <RevokeButton userId={t.user_id} role={t.role as 'moderator' | 'municipal_admin'} municipalityId={t.municipality_id} name={t.name} />
                )}
              </li>
            ))}
          </ul>
        </Card>

        <div className="flex flex-col gap-4">
          <Card className="p-5">
            <h2 className="mb-1 text-lg font-bold">Dar un rol</h2>
            <p className="mb-4 text-[15px] text-muted">La persona debe haber entrado al menos una vez a la aplicación.</p>
            <form className="mb-4 flex gap-2" action="/admin/equipo">
              <label htmlFor="buscar-persona" className="sr-only">Buscar por nombre</label>
              <input id="buscar-persona" name="q" defaultValue={q} placeholder="Buscar por nombre" className="h-11 min-w-0 flex-1 rounded-[12px] border border-line-strong px-3 text-[16px] focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15" />
              <button type="submit" className="h-11 rounded-[12px] bg-ink px-4 font-semibold text-white">Buscar</button>
            </form>
            {q && people.length === 0 && <p className="text-[15px] text-muted">No encontramos a nadie con «{q}».</p>}
            {people.length > 0 && (
              <GrantForm
                people={people.map((p) => ({ id: p.id, name: p.display_name ?? 'Sin nombre' }))}
                municipalities={scope.map((m) => ({ id: m.id, name: m.name }))}
                canGrantAdmin={viewer.isProvincialAdmin}
              />
            )}
          </Card>
          <Notice tone="neutral">
            La administración <strong>provincial</strong> no se asigna desde aquí: se crea con un script de operación revisado y auditado (ADR-020).
          </Notice>
        </div>
      </div>
    </>
  );
}
