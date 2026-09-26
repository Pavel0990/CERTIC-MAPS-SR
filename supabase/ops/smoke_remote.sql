-- Prueba de humo en un proyecto Supabase real (no deja datos: todo se revierte al final).
-- Ejecuta las RPC principales con PostGIS/pg_net/pg_cron reales y devuelve los resultados en el
-- mensaje del error final "SMOKE_RESULT". Uso: npx supabase db query --linked -f supabase/ops/smoke_remote.sql
do $smoke$
declare
  v_prov uuid;
  v_muni uuid;
  v_uid uuid := gen_random_uuid();
  v_adm uuid := gen_random_uuid();
  r jsonb := '{}'::jsonb;
  x jsonb;
  claims_user text;
  claims_adm text;
begin
  select id into v_prov from public.provinces where code = 'SR';
  if v_prov is null then
    insert into public.provinces (code, name) values ('SR', 'Santiago Rodríguez') returning id into v_prov;
  end if;
  insert into public.municipalities (province_id, code, name, geom)
  values (v_prov, 'SMOKE', 'Municipio de prueba',
          st_multi(st_makeenvelope(-71.40, 19.43, -71.30, 19.52, 4326)))
  returning id into v_muni;

  insert into auth.users (id, email, aud, role, raw_user_meta_data)
  values (v_uid, 'smoke-user@example.invalid', 'authenticated', 'authenticated', '{"display_name":"Smoke"}'),
         (v_adm, 'smoke-adm@example.invalid', 'authenticated', 'authenticated', '{"display_name":"Smoke Admin"}');
  insert into public.user_roles (user_id, role, province_id, municipality_id) values (v_adm, 'municipal_admin', v_prov, v_muni);
  r := r || jsonb_build_object('perfil_creado', exists (select 1 from public.profiles where id = v_uid));

  claims_user := json_build_object('sub', v_uid, 'role', 'authenticated')::text;
  claims_adm  := json_build_object('sub', v_adm, 'role', 'authenticated')::text;

  perform set_config('request.jwt.claims', claims_user, true);
  x := public.create_traffic_report('bache', 19.47, -71.35, 'smoke-key-0001', null::smallint, 'prueba');
  r := r || jsonb_build_object('create_traffic_report', x);
  r := r || jsonb_build_object('create_citizen_request',
         public.create_citizen_request('incident', 'basura', 'Basura en la esquina', 'prueba', 'smoke-key-0002', 19.48, -71.34, null));
  r := r || jsonb_build_object('submit_business',
         public.submit_business('Colmado Smoke', 'colmado', 19.47, -71.36, 'smoke-key-0003', null, '809-555-0101', null, null, null, null));
  r := r || jsonb_build_object('propose_place', public.propose_place('Mirador Smoke', 'mirador', 19.49, -71.33, null));
  r := r || jsonb_build_object('propose_route', public.propose_route('Ruta Smoke', 'ecologica', 'media', 90,
         '{"type":"LineString","coordinates":[[-71.39,19.44],[-71.36,19.46],[-71.33,19.50]]}'::jsonb, null));
  r := r || jsonb_build_object('my_activity_ok', (public.my_activity() ->> 'status') is distinct from 'rejected');

  perform set_config('request.jwt.claims', claims_adm, true);
  x := public.moderate_traffic_report((r -> 'create_traffic_report' ->> 'id')::uuid, 'pending', 'active', null);
  r := r || jsonb_build_object('moderate_traffic_report', x);
  r := r || jsonb_build_object('kpi_summary_ok', (public.kpi_summary(current_date - 7, current_date, v_muni) ->> 'status') is distinct from 'rejected');

  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  x := public.map_features(-71.45, 19.40, -71.25, 19.55, array['business','tourism','route','traffic','request'], 500);
  r := r || jsonb_build_object('map_features_n', jsonb_array_length(x -> 'features'));
  r := r || jsonb_build_object('map_aggregates_ok', public.map_aggregates() is not null);
  r := r || jsonb_build_object('search_all_ok', (select count(*) from public.search_all('colmado', 10)) >= 0);

  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  r := r || jsonb_build_object('worker_queue_health', public.worker_queue_health());
  r := r || jsonb_build_object('jobs_encolados', (select jsonb_object_agg(kind, n) from (select kind, count(*) n from private.jobs group by kind) j));
  r := r || jsonb_build_object('expire_traffic_reports', private.expire_traffic_reports());
  r := r || jsonb_build_object('apply_retention', private.apply_retention());
  r := r || jsonb_build_object('postgis', extensions.postgis_lib_version());

  raise exception 'SMOKE_RESULT %', r;
end
$smoke$;
