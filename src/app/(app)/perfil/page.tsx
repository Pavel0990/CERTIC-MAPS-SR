import type { Metadata } from 'next';
import Link from 'next/link';
import { Bell, ChevronRight, LayoutDashboard, LogOut, MapPinPlus, Route, Store } from 'lucide-react';
import { getPreferences, TOPICS } from '@/modules/notifications/server';
import { PageShell } from '@/components/shared/page';
import { Button } from '@/components/ui/button';
import { Card, Eyebrow } from '@/components/ui/primitives';
import { requireViewer } from '@/lib/auth';
import { getCatalogs } from '@/lib/catalogs';
import { createClient } from '@/lib/supabase/server';
import { signOut } from '../entrar/actions';
import { PreferencesForm, ProfileForm } from './forms';

export const metadata: Metadata = { title: 'Perfil' };

export default async function ProfilePage() {
  const viewer = await requireViewer('/perfil');
  const supabase = await createClient();
  const [catalogs, prefs, unread] = await Promise.all([
    getCatalogs(),
    getPreferences(supabase, viewer.id),
    supabase.from('notifications').select('id', { count: 'exact', head: true }).is('read_at', null),
  ]);
  const roleLabel = viewer.isProvincialAdmin ? 'Administración provincial' : viewer.isAdmin ? 'Administración municipal' : viewer.isStaff ? 'Moderación' : viewer.isEntrepreneur ? 'Emprendedor' : 'Ciudadano';

  return (
    <PageShell title={viewer.displayName} eyebrow={roleLabel} description={viewer.email}>
      <div className="grid gap-4 md:grid-cols-[1fr_300px]">
        <div className="flex flex-col gap-4">
          <Card className="p-5">
            <h2 className="mb-4 text-lg font-bold">Tus datos</h2>
            <ProfileForm name={viewer.displayName} municipalityId={viewer.homeMunicipalityId} municipalities={catalogs.municipalities} />
          </Card>
          <Card className="p-5">
            <h2 className="mb-1 text-lg font-bold">Avisos</h2>
            <p className="mb-4 text-[15px] text-muted">
              Siempre los verás en la campana de la aplicación. Las notificaciones en el teléfono se activan pronto.
            </p>
            <PreferencesForm
              topics={TOPICS}
              selectedTopics={prefs.topics}
              municipalities={catalogs.municipalities}
              selectedMunicipalities={prefs.municipalities}
              emailEnabled={prefs.email_enabled}
            />
          </Card>
        </div>
        <div className="flex flex-col gap-4">
          <Card className="overflow-hidden">
            <MenuLink href="/notificaciones" icon={<Bell className="size-5" />} label="Notificaciones" badge={unread.count ?? 0} />
            {viewer.isStaff && <MenuLink href="/admin" icon={<LayoutDashboard className="size-5" />} label="Panel municipal" />}
            {viewer.isEntrepreneur && <MenuLink href="/negocio" icon={<Store className="size-5" />} label="Mi negocio" />}
            <MenuLink href="/negocios/registrar" icon={<Store className="size-5" />} label="Registrar un negocio" />
            <MenuLink href="/proponer" icon={<MapPinPlus className="size-5" />} label="Proponer un lugar" />
            <MenuLink href="/proponer?que=ruta" icon={<Route className="size-5" />} label="Proponer una ruta" />
          </Card>
          <Card className="p-5">
            <Eyebrow>Tu privacidad</Eyebrow>
            <p className="mt-2 text-[15px] text-muted">
              Tu nombre nunca sale en el mapa público. Solo usamos tu ubicación cuando tú la pides para un reporte, y quitamos los datos ocultos de tus fotos.
            </p>
          </Card>
          <form action={signOut}>
            <Button type="submit" variant="secondary" block icon={<LogOut className="size-4" />}>
              Salir de mi cuenta
            </Button>
          </form>
        </div>
      </div>
    </PageShell>
  );
}

function MenuLink({ href, icon, label, badge = 0 }: { href: string; icon: React.ReactNode; label: string; badge?: number }) {
  return (
    <Link href={href} className="flex items-center gap-3 border-b border-line px-5 py-4 font-semibold last:border-0 hover:bg-[#fafbfc]">
      <span className="text-muted" aria-hidden>{icon}</span>
      <span className="flex-1">{label}</span>
      {badge > 0 && <span className="rounded-full bg-danger px-2 py-0.5 text-[12px] font-bold text-white">{badge} sin leer</span>}
      <ChevronRight className="size-4 text-subtle" aria-hidden />
    </Link>
  );
}
