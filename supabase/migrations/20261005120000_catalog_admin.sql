-- =====================================================================
-- SR Conecta · 300 · Catálogos editables desde el panel (sin deploy ni SQL)
-- Referencia: ARCHITECTURE.md §8.5 ("catálogos editables sin deploy") · criterio de sostenibilidad
-- Tipos de tránsito, categorías de reportes y categorías de negocios valen para toda la provincia:
-- los edita la administración provincial. Nada se borra (hay reportes y negocios que los usan):
-- se desactiva, y deja de ofrecerse en los formularios y el mapa.
-- =====================================================================
set search_path = public, extensions;

-- 1. Todo el catálogo, también lo desactivado, con cuántos registros usan cada elemento
create or replace function public.catalog_admin_list()
returns jsonb
language plpgsql stable security definer
set search_path = ''
as $$
begin
  if not private.is_provincial_admin() then return private.reject('forbidden'); end if;
  return jsonb_build_object(
    'status', 'ok',
    'traffic_types', coalesce((select jsonb_agg(jsonb_build_object(
        'code', t.code, 'name', t.name, 'icon', t.icon, 'sort', t.sort, 'active', t.active,
        'default_severity', t.default_severity,
        'default_ttl_hours', (extract(epoch from t.default_ttl) / 3600)::integer,
        'in_use', (select count(*) from public.traffic_reports r where r.type = t.code)) order by t.sort, t.name)
      from public.traffic_report_types t), '[]'::jsonb),
    'request_categories', coalesce((select jsonb_agg(jsonb_build_object(
        'code', c.code, 'kind', c.kind, 'name', c.name, 'icon', c.icon, 'sort', c.sort, 'active', c.active,
        'in_use', (select count(*) from public.citizen_requests r where r.category = c.code)) order by c.kind, c.sort, c.name)
      from public.request_categories c), '[]'::jsonb),
    'business_categories', coalesce((select jsonb_agg(jsonb_build_object(
        'code', b.slug, 'name', b.name, 'icon', b.icon, 'sort', b.sort, 'active', b.active,
        'in_use', (select count(*) from public.businesses x where x.category_id = b.id and x.deleted_at is null)) order by b.sort, b.name)
      from public.business_categories b), '[]'::jsonb));
end $$;

-- 2. Crear (p_code nulo) o editar un elemento. Lista blanca de campos por catálogo; el código se
--    genera del nombre al crear y nunca cambia (lo guardan los reportes y los negocios).
create or replace function public.save_catalog_item(p_catalog text, p_code text, p_changes jsonb)
returns jsonb
language plpgsql security definer
set search_path = pg_catalog, extensions, public
as $$
declare
  v_allowed text[];
  v_key text;
  v_name text := nullif(btrim(p_changes ->> 'name'), '');
  v_icon text := p_changes ->> 'icon';
  v_code text;
  v_base text;
  v_before jsonb;
  v_after jsonb;
  v_kind text;
  i integer := 0;
begin
  if (select auth.uid()) is null then return private.reject('not_authenticated'); end if;
  if not private.is_provincial_admin() then return private.reject('forbidden'); end if;
  if not private.hit_rate_limit('staff_action') then return private.reject('rate_limited'); end if;
  if p_changes is null or jsonb_typeof(p_changes) <> 'object' then return private.reject('no_changes'); end if;

  v_allowed := case p_catalog
    when 'traffic_types'       then array['name', 'icon', 'sort', 'active', 'default_severity', 'default_ttl_hours']
    when 'request_categories'  then array['name', 'icon', 'sort', 'active', 'kind']
    when 'business_categories' then array['name', 'icon', 'sort', 'active']
    else null end;
  if v_allowed is null then return private.reject('invalid_catalog'); end if;
  for v_key in select jsonb_object_keys(p_changes) loop
    if not v_key = any (v_allowed) then return private.reject('unknown_field', jsonb_build_object('field', v_key)); end if;
  end loop;
  if p_changes ? 'name' and (v_name is null or char_length(v_name) not between 2 and 60) then return private.reject('invalid_name'); end if;
  if p_changes ? 'icon' and (v_icon is null or v_icon !~ '^[a-z0-9-]{2,30}$') then return private.reject('invalid_field'); end if;
  if p_code is not null and p_changes ? 'kind' then return private.reject('not_editable'); end if;   -- el tipo de una categoría no cambia

  if p_code is null then
    -- Alta: nombre e ícono obligatorios; código único derivado del nombre
    if v_name is null or v_icon is null then return private.reject('invalid_name'); end if;
    if p_catalog = 'business_categories' then
      v_base := left(coalesce(private.slugify(v_name), 'categoria'), 34);
      v_code := v_base;
      while exists (select 1 from public.business_categories where slug = v_code) loop
        i := i + 1; v_code := v_base || '-' || (i + 1);
      end loop;
      insert into public.business_categories (slug, name, icon, sort, active)
      values (v_code, v_name, v_icon, coalesce((p_changes ->> 'sort')::smallint, 100), coalesce((p_changes ->> 'active')::boolean, true));
    else
      v_base := left(trim(both '_' from regexp_replace(replace(coalesce(private.slugify(v_name), ''), '-', '_'), '[^a-z_]', '', 'g')), 26);
      if char_length(v_base) < 2 then v_base := 'tipo'; end if;
      v_code := v_base;
      while exists (select 1 from public.traffic_report_types where code = v_code)
         or exists (select 1 from public.request_categories where code = v_code) loop
        i := i + 1; v_code := v_base || '_' || chr(97 + (i % 26)) || repeat('x', i / 26);
      end loop;
      if p_catalog = 'traffic_types' then
        insert into public.traffic_report_types (code, name, icon, default_severity, default_ttl, sort, active)
        values (v_code, v_name, v_icon, coalesce((p_changes ->> 'default_severity')::smallint, 2),
                make_interval(hours => coalesce((p_changes ->> 'default_ttl_hours')::integer, 24)),
                coalesce((p_changes ->> 'sort')::smallint, 100), coalesce((p_changes ->> 'active')::boolean, true));
      else
        v_kind := p_changes ->> 'kind';
        if v_kind is null or v_kind not in ('incident', 'inquiry') then return private.reject('invalid_type'); end if;
        insert into public.request_categories (code, kind, name, icon, sort, active)
        values (v_code, v_kind, v_name, v_icon, coalesce((p_changes ->> 'sort')::smallint, 100), coalesce((p_changes ->> 'active')::boolean, true));
      end if;
    end if;
    perform private.audit('catalog.create', p_catalog, null, null, jsonb_build_object('code', v_code) || p_changes);
    return jsonb_build_object('status', 'ok', 'code', v_code);
  end if;

  -- Edición
  if p_catalog = 'traffic_types' then
    select to_jsonb(t) into v_before from public.traffic_report_types t where t.code = p_code;
    if v_before is null then return private.reject('not_found'); end if;
    update public.traffic_report_types set
      name = coalesce(v_name, name),
      icon = coalesce(v_icon, icon),
      sort = coalesce((p_changes ->> 'sort')::smallint, sort),
      active = coalesce((p_changes ->> 'active')::boolean, active),
      default_severity = coalesce((p_changes ->> 'default_severity')::smallint, default_severity),
      default_ttl = coalesce(make_interval(hours => (p_changes ->> 'default_ttl_hours')::integer), default_ttl)
    where code = p_code;
    if not exists (select 1 from public.traffic_report_types where active) then
      raise exception 'last_active' using errcode = 'P0001';
    end if;
    select to_jsonb(t) into v_after from public.traffic_report_types t where t.code = p_code;
  elsif p_catalog = 'request_categories' then
    select to_jsonb(c) into v_before from public.request_categories c where c.code = p_code;
    if v_before is null then return private.reject('not_found'); end if;
    update public.request_categories set
      name = coalesce(v_name, name),
      icon = coalesce(v_icon, icon),
      sort = coalesce((p_changes ->> 'sort')::smallint, sort),
      active = coalesce((p_changes ->> 'active')::boolean, active)
    where code = p_code;
    -- cada tipo (problema / consulta) conserva al menos una categoría activa
    if not exists (select 1 from public.request_categories where active and kind = v_before ->> 'kind') then
      raise exception 'last_active' using errcode = 'P0001';
    end if;
    select to_jsonb(c) into v_after from public.request_categories c where c.code = p_code;
  else
    select to_jsonb(b) into v_before from public.business_categories b where b.slug = p_code;
    if v_before is null then return private.reject('not_found'); end if;
    update public.business_categories set
      name = coalesce(v_name, name),
      icon = coalesce(v_icon, icon),
      sort = coalesce((p_changes ->> 'sort')::smallint, sort),
      active = coalesce((p_changes ->> 'active')::boolean, active)
    where slug = p_code;
    if not exists (select 1 from public.business_categories where active) then
      raise exception 'last_active' using errcode = 'P0001';
    end if;
    select to_jsonb(b) into v_after from public.business_categories b where b.slug = p_code;
  end if;
  perform private.audit('catalog.update', p_catalog, null, v_before, v_after);
  return jsonb_build_object('status', 'ok', 'code', p_code);
exception
  when raise_exception then
    if sqlerrm = 'last_active' then return private.reject('last_active'); end if;
    raise;
  when check_violation or invalid_text_representation or numeric_value_out_of_range or datetime_field_overflow then
    return private.reject('invalid_field', jsonb_build_object('detail', sqlerrm));
end $$;

-- Ícono propio para el colmado (antes compartía el de "Otro")
update public.business_categories set icon = 'shopping-basket' where slug = 'colmado' and icon = 'store';

revoke all on function public.catalog_admin_list() from public, anon;
revoke all on function public.save_catalog_item(text, text, jsonb) from public, anon;
grant execute on function public.catalog_admin_list(), public.save_catalog_item(text, text, jsonb) to authenticated;
