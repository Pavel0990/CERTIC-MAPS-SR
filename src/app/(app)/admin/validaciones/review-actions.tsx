'use client';
import { Archive, Check, Pause, X } from 'lucide-react';
import type { ContentEntity } from '@/modules/admin/server';
import { ActionButton } from '../_components/action-button';
import { review } from '../actions';

/** Acciones de revisión según private.content_transitions (una transición por botón). */
export function ReviewActions({ entity, id, status, publishable = true }: { entity: ContentEntity; id: string; status: string; publishable?: boolean }) {
  const go = (to: string, reason?: string) => review(entity, id, status, to, reason);
  const reject = (
    <ActionButton
      label="No aprobar"
      done="Rechazado. Avisamos a quien lo envió."
      variant="danger"
      icon={<X className="size-4" />}
      run={(r) => go('rejected', r)}
      ask={{ title: 'No aprobar', label: 'Motivo (lo verá quien lo envió)', hint: 'Explica qué falta o qué hay que corregir.', required: true }}
    />
  );
  return (
    <div className="flex flex-wrap gap-2">
      {entity === 'business' && status === 'pending' && (
        <ActionButton label="Empezar verificación" done="En verificación." variant="primary" run={() => go('under_review')} />
      )}
      {entity === 'business' && status === 'under_review' && (
        <ActionButton label="Aprobar negocio" done="Aprobado. Ya aparece en el mapa." variant="primary" icon={<Check className="size-4" />} run={() => go('approved')} />
      )}
      {entity === 'business' && status === 'approved' && (
        <>
          <ActionButton label="Suspender" done="Suspendido. Salió del mapa y sus promociones se pausaron." variant="danger" icon={<Pause className="size-4" />} run={(r) => go('suspended', r)} ask={{ title: 'Suspender negocio', label: 'Motivo', required: true }} />
          <ActionButton label="Archivar" done="Archivado." icon={<Archive className="size-4" />} run={() => go('archived')} />
        </>
      )}
      {(entity === 'place' || entity === 'route') && status === 'pending' && (
        <ActionButton label="Publicar" done="Publicado en el mapa." variant="primary" icon={<Check className="size-4" />} run={() => go('published')} />
      )}
      {entity === 'promotion' && status === 'pending' && (
        <ActionButton label="Aprobar promoción" done="Promoción activa." variant="primary" icon={<Check className="size-4" />} run={() => go('active')} />
      )}
      {entity === 'attachment' && status === 'processed' && publishable && (
        <ActionButton label="Aprobar foto" done="Foto aprobada." variant="primary" icon={<Check className="size-4" />} run={() => go('approved')} />
      )}
      {['pending', 'under_review', 'processed'].includes(status) && reject}
    </div>
  );
}
