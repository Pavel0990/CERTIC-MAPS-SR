import type { Metadata } from 'next';
import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import { Card, EmptyState } from '@/components/ui/primitives';

export const metadata: Metadata = { title: 'Sin permiso' };

export default function NoPermissionPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <Card>
        <EmptyState
          icon={<ShieldAlert className="size-7" />}
          title="Esta sección es para el personal del municipio"
          action={<Link href="/" className="mt-2 inline-flex h-12 items-center rounded-[14px] bg-ink px-5 font-semibold text-white">Volver al mapa</Link>}
        >
          Si trabajas en el ayuntamiento y necesitas acceso, pide a la administración municipal que te asigne el rol.
        </EmptyState>
      </Card>
    </div>
  );
}
