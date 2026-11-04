import type { Metadata } from 'next';
import { requireViewer } from '@/lib/auth';
import { PlaceWizard } from './place-wizard';
import { RouteWizard } from './route-wizard';

export const metadata: Metadata = { title: 'Proponer' };

export default async function ProposePage({ searchParams }: { searchParams: Promise<{ que?: string }> }) {
  const { que } = await searchParams;
  const route = que === 'ruta';
  const viewer = await requireViewer(route ? '/proponer?que=ruta' : '/proponer');
  return route ? <RouteWizard staff={viewer.isStaff} /> : <PlaceWizard staff={viewer.isStaff} />;
}
