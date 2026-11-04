import type { Metadata } from 'next';
import { requireViewer } from '@/lib/auth';
import { getCatalogs } from '@/lib/catalogs';
import { BusinessWizard } from './business-wizard';

export const metadata: Metadata = { title: 'Registrar un negocio' };

export default async function RegisterBusinessPage() {
  await requireViewer('/negocios/registrar');
  const { businessCategories } = await getCatalogs();
  return <BusinessWizard categories={businessCategories.map((c) => ({ slug: c.slug, name: c.name, icon: c.icon }))} />;
}
