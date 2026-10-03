-- =====================================================================
-- SR Conecta · 290 · Promociones: "hoy" es la fecha de República Dominicana, no la UTC
-- Referencia: ARCHITECTURE.md §9.6 (zona horaria) · hallazgo del frente A (02/10/2026)
-- `current_date` usa la zona de la sesión (UTC en Supabase). Entre las 8 p. m. y la medianoche de RD
-- ya es "mañana" en UTC, así que:
--   · create_promotion rechazaba las promociones que empiezan hoy (invalid_dates);
--   · la política de lectura escondía antes de tiempo las que terminan hoy y mostraba antes de
--     tiempo las que empiezan mañana.
-- =====================================================================
set search_path = public, extensions;

-- Fecha de hoy en la provincia (UTC−4, sin horario de verano). STABLE: una vez por consulta.
create or replace function private.local_today()
returns date
language sql stable
set search_path = ''
as $$
  select (now() at time zone 'America/Santo_Domingo')::date
$$;
-- La evalúa la política de lectura de promociones, también para anon
grant execute on function private.local_today() to anon, authenticated, service_role;

create or replace function public.create_promotion(
  p_business_id uuid, p_title text, p_valid_from date, p_valid_until date, p_description text default null)
returns jsonb
language plpgsql security definer
set search_path = pg_catalog, extensions, public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_id uuid;
  v_status text;
begin
  if v_uid is null then return private.reject('not_authenticated'); end if;
  if not private.hit_rate_limit('business_update') then return private.reject('rate_limited'); end if;
  select status into v_status from public.businesses where id = p_business_id and deleted_at is null;
  if not found then return private.reject('not_found'); end if;
  if not private.is_business_member(p_business_id) then return private.reject('forbidden'); end if;
  if v_status <> 'approved' then return private.reject('business_not_approved'); end if;
  if p_valid_from < private.local_today() then return private.reject('invalid_dates'); end if;
  insert into public.promotions (business_id, title, description, valid_from, valid_until, created_by)
  values (p_business_id, btrim(p_title), nullif(btrim(p_description), ''), p_valid_from, p_valid_until, v_uid)
  returning id into v_id;
  perform private.enqueue('notify_moderators', jsonb_build_object('entity', 'promotion', 'id', v_id));
  return jsonb_build_object('status', 'ok', 'id', v_id, 'promotion_status', 'pending');
exception when check_violation or not_null_violation then
  return private.reject('invalid_field', jsonb_build_object('detail', sqlerrm));
end $$;

drop policy promotions_read on public.promotions;
create policy promotions_read on public.promotions for select to anon, authenticated
  using ((status = 'active' and (select private.local_today()) between valid_from and valid_until
          and exists (select 1 from public.businesses b where b.id = business_id and b.status = 'approved'))
         or private.is_business_member(business_id)
         or exists (select 1 from public.businesses b where b.id = business_id and private.is_staff(b.municipality_id)));
