'use client';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { CircleAlert, Pencil, Plus } from 'lucide-react';
import type { CatalogItem, CatalogKey } from '@/modules/admin/server';
import { CATALOG_ICONS, catalogIcon } from '@/components/shared/catalog-icon';
import { Button } from '@/components/ui/button';
import { Field, Input, Select } from '@/components/ui/form';
import { Badge, Card } from '@/components/ui/primitives';
import { Sheet } from '@/components/ui/sheet';
import { useToast } from '@/components/ui/toast';
import { SEVERITY, reasonMessage } from '@/lib/vocabulary';
import { cn } from '@/utils/cn';
import { saveCatalog } from '../actions';

const KIND = { incident: 'Problema', inquiry: 'Consulta' } as const;
const DURATIONS = [
  { hours: 1, label: '1 hora' }, { hours: 3, label: '3 horas' }, { hours: 6, label: '6 horas' }, { hours: 12, label: '12 horas' },
  { hours: 24, label: '1 día' }, { hours: 48, label: '2 días' }, { hours: 168, label: '1 semana' }, { hours: 336, label: '2 semanas' },
  { hours: 720, label: '30 días' },
];
const durationLabel = (h?: number) => DURATIONS.find((d) => d.hours === h)?.label ?? (h ? `${h} h` : '');

type Draft = { code: string | null; name: string; icon: string; sort: number; active: boolean; kind: 'incident' | 'inquiry'; severity: number; ttl: number };

const toDraft = (i: CatalogItem | null): Draft => ({
  code: i?.code ?? null,
  name: i?.name ?? '',
  icon: i?.icon ?? 'alert',
  sort: i?.sort ?? 100,
  active: i?.active ?? true,
  kind: i?.kind ?? 'incident',
  severity: i?.default_severity ?? 2,
  ttl: i?.default_ttl_hours ?? 24,
});

export function CatalogEditor({ catalog, items }: { catalog: CatalogKey; items: CatalogItem[] }) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const isTraffic = catalog === 'traffic_types';
  const isRequest = catalog === 'request_categories';

  const save = () =>
    start(async () => {
      if (!draft) return;
      const base = { name: draft.name, icon: draft.icon, sort: draft.sort, active: draft.active };
      const changes = isTraffic ? { ...base, default_severity: draft.severity, default_ttl_hours: draft.ttl }
        : isRequest && !draft.code ? { ...base, kind: draft.kind } : base;
      const r = await saveCatalog(catalog, draft.code, changes);
      if (r.status === 'ok') {
        toast.show(draft.code ? 'Cambios guardados.' : 'Agregado. Ya aparece en los formularios.');
        setDraft(null);
        router.refresh();
      } else {
        toast.show(r.reason === 'last_active' ? 'Tiene que quedar al menos una opción activa.' : reasonMessage(r.reason), 'error');
      }
    });

  return (
    <>
      <Card className="overflow-hidden">
        <ul>
          {items.map((i) => {
            const Icon = catalogIcon(i.icon, CircleAlert);
            return (
              <li key={i.code} className={cn('flex flex-wrap items-center gap-3 border-b border-line px-4 py-3 last:border-0 md:px-5', !i.active && 'bg-canvas')}>
                <span className={cn('grid size-11 shrink-0 place-items-center rounded-[12px]', i.active ? 'bg-brand-soft text-brand-strong' : 'bg-line text-subtle')} aria-hidden>
                  <Icon className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cn('block font-semibold', !i.active && 'text-muted line-through')}>{i.name}</span>
                  <span className="block text-sm text-muted">
                    {[
                      isRequest && i.kind ? KIND[i.kind] : null,
                      isTraffic && i.default_severity ? `Gravedad ${SEVERITY[i.default_severity]?.label.toLowerCase()}` : null,
                      isTraffic ? `se muestra ${durationLabel(i.default_ttl_hours)}` : null,
                      i.in_use === 1 ? 'usado 1 vez' : `usado ${i.in_use} veces`,
                    ].filter(Boolean).join(' · ')}
                  </span>
                </span>
                {!i.active && <Badge tone="neutral">Desactivado</Badge>}
                <Button size="sm" variant="secondary" icon={<Pencil className="size-4" />} onClick={() => setDraft(toDraft(i))} aria-label={`Editar ${i.name}`}>
                  Editar
                </Button>
              </li>
            );
          })}
        </ul>
        <div className="border-t border-line p-4 md:px-5">
          <Button icon={<Plus className="size-4" />} onClick={() => setDraft(toDraft(null))}>Agregar</Button>
        </div>
      </Card>

      <Sheet open={!!draft} onClose={() => setDraft(null)} title={draft?.code ? 'Editar' : 'Agregar'}>
        {draft && (
          <div className="flex flex-col gap-4">
            <Field label="Nombre" hint="Como lo verán los vecinos. Corto y sencillo.">
              {(a) => <Input {...a} value={draft.name} maxLength={60} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />}
            </Field>

            {isRequest && !draft.code && (
              <Field label="Tipo" hint="No se puede cambiar después.">
                {(a) => (
                  <Select {...a} value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as Draft['kind'] })}>
                    <option value="incident">Problema (algo que hay que arreglar)</option>
                    <option value="inquiry">Consulta (una pregunta o propuesta)</option>
                  </Select>
                )}
              </Field>
            )}

            {isTraffic && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Gravedad" hint="La que se propone al reportar.">
                  {(a) => (
                    <Select {...a} value={draft.severity} onChange={(e) => setDraft({ ...draft, severity: Number(e.target.value) })}>
                      {[1, 2, 3].map((n) => <option key={n} value={n}>{SEVERITY[n]?.label}</option>)}
                    </Select>
                  )}
                </Field>
                <Field label="Se muestra en el mapa" hint="Si nadie la cierra antes.">
                  {(a) => (
                    <Select {...a} value={draft.ttl} onChange={(e) => setDraft({ ...draft, ttl: Number(e.target.value) })}>
                      {DURATIONS.map((d) => <option key={d.hours} value={d.hours}>{d.label}</option>)}
                    </Select>
                  )}
                </Field>
              </div>
            )}

            <fieldset>
              <legend className="mb-2 text-[15px] font-semibold">Ícono</legend>
              <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-8" role="radiogroup">
                {Object.entries(CATALOG_ICONS).map(([name, { icon: Icon, label }]) => (
                  <button
                    key={name}
                    type="button"
                    role="radio"
                    aria-checked={draft.icon === name}
                    aria-label={label}
                    title={label}
                    onClick={() => setDraft({ ...draft, icon: name })}
                    className={cn('grid aspect-square place-items-center rounded-[10px] border transition', draft.icon === name ? 'border-brand bg-brand-soft text-brand-strong ring-2 ring-brand/30' : 'border-line text-muted hover:bg-canvas')}
                  >
                    <Icon className="size-5" aria-hidden />
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Orden" hint="Los números más bajos salen primero.">
                {(a) => <Input {...a} type="number" inputMode="numeric" min={0} max={999} value={draft.sort} onChange={(e) => setDraft({ ...draft, sort: Math.max(0, Math.min(999, Number(e.target.value) || 0)) })} />}
              </Field>
              <label className="flex cursor-pointer items-center gap-3 self-end rounded-[12px] border border-line p-3">
                <input type="checkbox" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} className="size-6 accent-[#2f6feb]" />
                <span>
                  <span className="block font-semibold">Activo</span>
                  <span className="block text-sm text-muted">Se ofrece en los formularios</span>
                </span>
              </label>
            </div>

            <div className="flex gap-2 pt-1">
              <Button loading={pending} disabled={draft.name.trim().length < 2} onClick={save}>Guardar</Button>
              <Button variant="ghost" onClick={() => setDraft(null)}>Cancelar</Button>
            </div>
          </div>
        )}
      </Sheet>
    </>
  );
}
