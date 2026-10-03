'use client';
import { useEffect, type ReactNode } from 'react';

type Entity = 'business' | 'tourism_place' | 'eco_route';
type Metric = 'view' | 'directions' | 'whatsapp';

/** Métricas anónimas de las fichas (POST /api/v1/engagement, §9.3). Nunca bloquea ni muestra errores. */
function track(entity: Entity, id: string, metric: Metric) {
  const body = JSON.stringify({ entity, id, metric });
  try {
    if (navigator.sendBeacon?.('/api/v1/engagement', new Blob([body], { type: 'application/json' }))) return;
  } catch {}
  fetch('/api/v1/engagement', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {});
}

/** Cuenta una vista por ficha y sesión del navegador. */
export function TrackView({ entity, id }: { entity: Entity; id: string }) {
  useEffect(() => {
    const key = `viewed:${entity}:${id}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch {}
    track(entity, id, 'view');
  }, [entity, id]);
  return null;
}

/** Enlace externo ("Cómo llegar", WhatsApp) que registra el clic antes de salir. */
export function TrackedLink({ entity, id, metric, href, className, children }: { entity: Entity; id: string; metric: Exclude<Metric, 'view'>; href: string; className?: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className} onClick={() => track(entity, id, metric)}>
      {children}
    </a>
  );
}
