-- =====================================================================
-- SR Conecta · 130 · Worker de la cola, informe semanal y mantenimiento programado
-- Referencia: DATABASE.md §6.4, §10 · ARCHITECTURE.md §12, §27, §32, ADR-016
-- =====================================================================
set search_path = public, extensions;

-- ---------------------------------------------------------------------
-- Worker (solo service_role): toma lotes con FOR UPDATE SKIP LOCKED, recupera locks vencidos
-- ---------------------------------------------------------------------
create or replace function public.worker_claim_jobs(p_limit integer default 10, p_lock_seconds integer default 120)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_jobs jsonb;
begin
  if not private.is_service() then raise exception 'forbidden' using errcode = '42501'; end if;
  with picked as (
    select j.id from private.jobs j
    where (j.status = 'pending' and j.run_at <= now())
       or (j.status = 'running' and j.locked_until < now())      -- worker caído: se reintenta
    order by j.run_at
    limit least(greatest(coalesce(p_limit, 10), 1), 50)
    for update skip locked
  ), upd as (
    update private.jobs j
    set status = 'running', attempts = j.attempts + 1,
        locked_until = now() + make_interval(secs => least(greatest(coalesce(p_lock_seconds, 120), 10), 900))
    from picked where j.id = picked.id
    returning j.id, j.kind, j.payload, j.attempts
  )
  select coalesce(jsonb_agg(to_jsonb(upd) order by upd.id), '[]'::jsonb) into v_jobs from upd;
  return v_jobs;
end $$;

create or replace function public.worker_finish_job(p_id bigint, p_ok boolean, p_error text default null)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if not private.is_service() then raise exception 'forbidden' using errcode = '42501'; end if;
  update private.jobs j
  set status = case when p_ok then 'done'
                    when j.attempts >= j.max_attempts then 'dead'
                    else 'pending' end,
      -- reintento con backoff exponencial: 30 s, 60 s, 2 min, 4 min…
      run_at = case when p_ok then j.run_at else now() + make_interval(secs => 30 * power(2, greatest(j.attempts - 1, 0))) end,
      locked_until = null,
      last_error = case when p_ok then null else left(p_error, 2000) end
  where j.id = p_id and j.status = 'running';
end $$;

-- ---------------------------------------------------------------------
-- Informe semanal (F6). Idempotente y con toma atómica; snapshots desde kpi_summary (misma fuente que el panel).
-- ---------------------------------------------------------------------
create or replace function public.weekly_report_begin(p_period_start date default null, p_manual boolean default false)
returns jsonb
language plpgsql security definer
set search_path = pg_catalog, extensions, public
as $$
declare
  v_province uuid := private.default_province_id();
  v_start date := coalesce(p_period_start,
                           date_trunc('week', (now() at time zone 'America/Santo_Domingo')::date)::date - 7);
  v_run public.report_runs;
  v_version integer;
begin
  if not (private.is_service() or (p_manual and private.is_provincial_admin())) then
    return private.reject('forbidden');
  end if;
  if extract(isodow from v_start) <> 1 then return private.reject('period_must_start_monday'); end if;

  if p_manual then
    -- regeneración: nueva versión, nunca sobrescribe (historial completo)
    select coalesce(max(version), 0) + 1 into v_version from public.report_runs
    where province_id = v_province and period_start = v_start;
    insert into public.report_runs (province_id, period_start, period_end, version, trigger, requested_by)
    values (v_province, v_start, v_start + 6, v_version, 'manual', (select auth.uid()))
    returning * into v_run;
  else
    insert into public.report_runs (province_id, period_start, period_end, version, trigger)
    values (v_province, v_start, v_start + 6, 1, 'cron')
    on conflict (province_id, period_start, version) do nothing
    returning * into v_run;
    if v_run.id is null then
      -- ya existía: tomarlo solo si quedó colgado o falló con reintentos disponibles (toma atómica)
      update public.report_runs r
      set status = 'running', attempts = r.attempts + 1, started_at = now(), error = null
      where r.province_id = v_province and r.period_start = v_start and r.version = 1
        and ((r.status = 'running' and r.started_at < now() - interval '15 minutes')
             or (r.status = 'failed' and r.attempts < 5))
      returning * into v_run;
      if v_run.id is null then
        return jsonb_build_object('status', 'skipped', 'reason', 'already_done_or_in_progress');
      end if;
    end if;
  end if;

  -- snapshots inmutables de esta ejecución: provincia (NULL) + cada municipio
  delete from public.weekly_kpi_snapshots where report_run_id = v_run.id;   -- reintento de la misma ejecución
  insert into public.weekly_kpi_snapshots (report_run_id, period_start, municipality_id, metrics)
  select v_run.id, v_start, mu.id, public.kpi_summary(v_start, v_start + 6, mu.id)
  from (select null::uuid as id union all select id from public.municipalities where province_id = v_province) mu;

  perform private.audit('report.begin', 'report_run', v_run.id, null,
                        jsonb_build_object('period_start', v_start, 'version', v_run.version, 'trigger', v_run.trigger));
  return jsonb_build_object('status', 'ok', 'run_id', v_run.id, 'period_start', v_start, 'version', v_run.version,
                            'snapshots', (select jsonb_agg(jsonb_build_object('municipality_id', s.municipality_id, 'metrics', s.metrics)
                                                           order by s.municipality_id nulls first)
                                          from public.weekly_kpi_snapshots s where s.report_run_id = v_run.id));
end $$;

create or replace function public.weekly_report_finish(p_run_id uuid, p_ok boolean, p_storage_path text default null,
                                                       p_error text default null)
returns jsonb
language plpgsql security definer
set search_path = pg_catalog, extensions, public
as $$
declare
  v_admin record;
begin
  if not private.is_service() then return private.reject('forbidden'); end if;
  update public.report_runs
  set status = case when p_ok then 'succeeded' else 'failed' end,
      storage_path = case when p_ok then p_storage_path else storage_path end,
      error = case when p_ok then null else left(p_error, 2000) end,
      finished_at = now()
  where id = p_run_id and status = 'running';
  if not found then return private.reject('not_running'); end if;
  if p_ok then
    for v_admin in select distinct r.user_id from public.user_roles r where r.role = 'municipal_admin' loop
      perform private.notify(v_admin.user_id, 'system', 'Informe semanal disponible',
                             'Ya puedes descargar el informe en el panel.', jsonb_build_object('report_run_id', p_run_id));
    end loop;
  end if;
  return jsonb_build_object('status', 'ok');
end $$;

-- ---------------------------------------------------------------------
-- Mantenimiento (lo invoca pg_cron; cada función es probable por separado)
-- ---------------------------------------------------------------------
create or replace function private.expire_traffic_reports()
returns integer
language sql security definer
set search_path = ''
as $$
  with e as (
    update public.traffic_reports set status = 'expired'
    where status in ('pending', 'active', 'verified') and expires_at <= now()
    returning 1)
  select count(*)::integer from e
$$;

create or replace function private.archive_resolved_requests()
returns integer
language plpgsql security definer
set search_path = ''
as $$
declare
  v_n integer;
begin
  with a as (
    update public.citizen_requests set status = 'archived'
    where status = 'resolved' and updated_at < now() - interval '30 days'
    returning id)
  insert into public.request_status_history (request_id, from_status, to_status, changed_by, note)
  select id, 'resolved', 'archived', null, 'Archivado automáticamente a los 30 días' from a;
  get diagnostics v_n = row_count;
  return v_n;
end $$;

-- Retención (ARCHITECTURE.md §32). Única función autorizada a modificar tablas de rastro.
create or replace function private.apply_retention()
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v jsonb := '{}'::jsonb;
  n integer;
begin
  update public.traffic_reports set reporter_id = null
  where reporter_id is not null and created_at < now() - interval '12 months';
  get diagnostics n = row_count; v := v || jsonb_build_object('traffic_authors_unlinked', n);

  delete from public.audit_logs where created_at < now() - interval '2 years';
  get diagnostics n = row_count; v := v || jsonb_build_object('audit_deleted', n);

  delete from public.notifications where read_at is not null and created_at < now() - interval '180 days';
  get diagnostics n = row_count; v := v || jsonb_build_object('notifications_deleted', n);

  delete from private.rate_limit_hits where window_start < now() - interval '2 days';
  get diagnostics n = row_count; v := v || jsonb_build_object('rate_limit_rows_deleted', n);

  delete from private.jobs where status in ('done', 'dead') and updated_at < now() - interval '14 days';
  get diagnostics n = row_count; v := v || jsonb_build_object('jobs_deleted', n);

  -- subidas que nunca se confirmaron: se rechazan y se encola el borrado del archivo
  with o as (
    update public.attachments set status = 'rejected'
    where status in ('pending', 'processing') and created_at < now() - interval '24 hours'
    returning bucket, path)
  select count(*) into n from (
    select private.enqueue('delete_storage_object', jsonb_build_object('bucket', bucket, 'path', path), 'del:' || path) from o) z;
  v := v || jsonb_build_object('orphan_uploads', n);
  return v;
end $$;

-- Despierta al worker por HTTP (pg_net) si hay trabajo. URL y secreto en Vault.
create or replace function private.wake_worker()
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_url text;
  v_secret text;
begin
  if not exists (select 1 from private.jobs where status = 'pending' and run_at <= now()
                 union all select 1 from private.jobs where status = 'running' and locked_until < now()) then
    return;
  end if;
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'worker_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'jobs_secret';
  if v_url is null or v_secret is null then
    raise warning 'wake_worker: faltan los secretos worker_url / jobs_secret en Vault';
    return;
  end if;
  perform net.http_post(url := v_url,
                        headers := jsonb_build_object('Authorization', 'Bearer ' || v_secret, 'Content-Type', 'application/json'),
                        body := '{}'::jsonb);
end $$;
