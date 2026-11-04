-- =====================================================================
-- SR Conecta · 230 · Descarga auditada del informe semanal
-- Referencia: ARCHITECTURE.md §9.6, §10.9, §12.2 · DATABASE.md §5.11
-- Toda descarga del PDF deja rastro en audit_logs, y el rastro es obligatorio:
-- Storage solo deja leer un PDF a quien registró la descarga en los últimos 5 minutos.
-- Así la URL firmada se crea con el JWT del administrador, nunca con service_role.
-- =====================================================================
set search_path = public, extensions;

-- ---------------------------------------------------------------------
-- 1. Autorizar y registrar la descarga
-- Pueden descargar: el administrador provincial y los administradores municipales
-- (el informe es provincial, con cifras agregadas y sin datos personales).
-- ---------------------------------------------------------------------
create or replace function public.authorize_report_download(p_run_id uuid)
returns jsonb
language plpgsql security definer
set search_path = pg_catalog, extensions, public
as $$
declare
  v_uid uuid := auth.uid();
  r public.report_runs;
begin
  if v_uid is null then return private.reject('not_authenticated'); end if;
  if not private.hit_rate_limit('staff_action') then return private.reject('rate_limited'); end if;

  select * into r from public.report_runs where id = p_run_id;
  if not found then return private.reject('not_found'); end if;

  if not (private.is_provincial_admin()
          or exists (select 1 from public.user_roles ur where ur.user_id = v_uid and ur.role = 'municipal_admin')) then
    perform private.audit('report.download', 'report_run', p_run_id, null, null, 'denied');
    return private.reject('forbidden');
  end if;

  if r.status <> 'succeeded' or r.storage_path is null then return private.reject('not_ready'); end if;

  perform private.audit('report.download', 'report_run', p_run_id, null,
                        jsonb_build_object('period_start', r.period_start, 'version', r.version), 'success');
  return jsonb_build_object('status', 'ok', 'bucket', 'reports-pdf', 'path', r.storage_path, 'valid_seconds', 300);
end $$;

-- ---------------------------------------------------------------------
-- 2. Condición de lectura en Storage: descarga registrada hace ≤ 5 minutos por el mismo usuario
-- ---------------------------------------------------------------------
create or replace function private.report_download_granted(p_path text)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.audit_logs a
    join public.report_runs r on r.id = a.entity_id
    where a.actor_id = (select auth.uid())
      and a.action = 'report.download'
      and a.result = 'success'
      and a.created_at > now() - interval '5 minutes'
      and r.storage_path = p_path)
$$;

create policy reports_pdf_read_after_audit on storage.objects for select to authenticated
  using (bucket_id = 'reports-pdf' and private.report_download_granted(name));

-- ---------------------------------------------------------------------
-- 3. Permisos
-- ---------------------------------------------------------------------
revoke all on function public.authorize_report_download(uuid) from public;
grant execute on function public.authorize_report_download(uuid) to authenticated;
revoke all on function private.report_download_granted(text) from public;
grant execute on function private.report_download_granted(text) to authenticated;
