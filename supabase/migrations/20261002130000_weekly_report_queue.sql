-- =====================================================================
-- SR Conecta · 270 · Informe semanal: generación manual por la cola y datos para el PDF
-- Referencia: ARCHITECTURE.md §9.6, §11.3 · ADR-014, ADR-016
-- La regeneración manual la pide el administrador provincial desde el panel. Su request NUNCA usa
-- service_role: esta función crea la versión nueva con sus snapshots (como siempre) y encola un job
-- 'pdf_weekly'; el worker renderiza y sube el PDF. El cron diario sigue renderizando en línea.
-- =====================================================================
set search_path = public, extensions;

insert into private.rate_limit_rules (action, max_count, window_size) values
  ('report_manual', 5, interval '1 hour')
on conflict (action) do nothing;

-- ---------------------------------------------------------------------
-- 1. "Generar ahora" (solo administración provincial; solo semanas ya cerradas)
-- ---------------------------------------------------------------------
create or replace function public.request_weekly_report(p_period_start date)
returns jsonb
language plpgsql security definer
set search_path = pg_catalog, extensions, public
as $$
declare
  v_last_closed date := date_trunc('week', (now() at time zone 'America/Santo_Domingo')::date)::date - 7;
  v jsonb;
begin
  if (select auth.uid()) is null then return private.reject('not_authenticated'); end if;
  if not private.is_provincial_admin() then return private.reject('forbidden'); end if;
  if not private.hit_rate_limit('report_manual') then return private.reject('rate_limited'); end if;
  if p_period_start is null or extract(isodow from p_period_start) <> 1 then return private.reject('period_must_start_monday'); end if;
  if p_period_start > v_last_closed then return private.reject('period_not_closed'); end if;
  if p_period_start < v_last_closed - 7 * 52 then return private.reject('invalid_period'); end if;

  v := public.weekly_report_begin(p_period_start, true);   -- valida el rol de nuevo, crea versión y snapshots, audita
  if v ->> 'status' <> 'ok' then return v; end if;
  perform private.enqueue('pdf_weekly', jsonb_build_object('run_id', v ->> 'run_id'), 'pdf:' || (v ->> 'run_id'));
  return jsonb_build_object('status', 'ok', 'run_id', v ->> 'run_id', 'version', v -> 'version', 'period_start', v -> 'period_start');
end $$;

-- ---------------------------------------------------------------------
-- 2. Todo lo que el PDF necesita de una ejecución: periodo, versión y snapshots con nombres.
-- Solo ejecuciones en curso: una terminada no se vuelve a renderizar.
-- ---------------------------------------------------------------------
create or replace function public.worker_report_run(p_run_id uuid)
returns jsonb
language sql stable security definer
set search_path = ''
as $$
  select case when not private.is_service() then null else (
    select jsonb_build_object(
      'run_id', r.id, 'period_start', r.period_start, 'period_end', r.period_end, 'version', r.version,
      'trigger', r.trigger, 'province_code', lower(p.code), 'province_name', p.name,
      'snapshots', coalesce((select jsonb_agg(jsonb_build_object('municipality_id', s.municipality_id, 'municipality_name', m.name,
                                                                 'metrics', s.metrics)
                                              order by s.municipality_id is not null, m.name)
                             from public.weekly_kpi_snapshots s
                             left join public.municipalities m on m.id = s.municipality_id
                             where s.report_run_id = r.id), '[]'::jsonb),
      'traffic_types', coalesce((select jsonb_object_agg(t.code, t.name) from public.traffic_report_types t), '{}'::jsonb))
    from public.report_runs r join public.provinces p on p.id = r.province_id
    where r.id = p_run_id and r.status = 'running')
  end
$$;

revoke all on function public.request_weekly_report(date) from public, anon;
grant execute on function public.request_weekly_report(date) to authenticated;
revoke all on function public.worker_report_run(uuid) from public, anon, authenticated;
grant execute on function public.worker_report_run(uuid) to service_role;
