import { Eyebrow } from '@/components/ui/primitives';
import { AttentionStrip } from './kpi-cards';

/** Inicio del panel para moderación: solo su trabajo pendiente, sin indicadores (§9.7). */
export function ModeratorHome({ counts, scopeNames }: { counts: { trafficPending: number; requestsPending: number; requestsInReview: number; validations: number }; scopeNames: string }) {
  const reports = counts.requestsPending + counts.requestsInReview;
  return (
    <div className="flex flex-col gap-5">
      <header>
        <Eyebrow>Moderación</Eyebrow>
        <h1 className="text-[28px] font-extrabold leading-tight md:text-[34px]">Tu trabajo hoy</h1>
        <p className="mt-1 text-[16px] text-muted">{scopeNames}</p>
      </header>
      <AttentionStrip items={[
        { label: 'Alertas por confirmar', value: counts.trafficPending, href: '/admin/bandeja', level: counts.trafficPending ? 'danger' : 'calm', help: 'Alertas de tránsito que esperan que las publiques o descartes.' },
        { label: 'Reportes por revisar', value: reports, href: '/admin/bandeja?ver=consultas', level: reports ? 'warn' : 'calm', help: 'Reportes al municipio nuevos o en revisión.' },
        { label: 'Por validar', value: counts.validations, href: '/admin/validaciones', level: counts.validations ? 'warn' : 'calm', help: 'Negocios, lugares, rutas, promociones y fotos que esperan aprobación.' },
      ]} />
    </div>
  );
}
