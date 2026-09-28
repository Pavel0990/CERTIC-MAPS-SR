import type { Metadata } from 'next';
import { requireViewer } from '@/lib/auth';
import { getCatalogs } from '@/lib/catalogs';
import { ReportWizard } from './report-wizard';

export const metadata: Metadata = { title: 'Reportar' };

export default async function ReportPage({ searchParams }: { searchParams: Promise<{ tipo?: string }> }) {
  await requireViewer('/reportar');
  const [{ tipo }, catalogs] = await Promise.all([searchParams, getCatalogs()]);
  return (
    <ReportWizard
      initialType={tipo}
      catalogs={{ trafficTypes: catalogs.trafficTypes, requestCategories: catalogs.requestCategories, municipalities: catalogs.municipalities }}
    />
  );
}
