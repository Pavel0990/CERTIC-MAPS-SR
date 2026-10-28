-- Auditoría de seguridad de la base (SECURITY.md · Auditoría del 17/10/2026).
-- Devuelve UNA FILA POR PROBLEMA; ninguna fila = todo en orden. Solo lee el catálogo, no cambia nada.
-- La usan: la prueba de la base (supabase/tests/run.mjs, sección U), `npm run db:audit` y .github/workflows/security.yml.
-- Si se agrega a propósito algo que esta consulta marca, se actualiza aquí con su justificación.

with
-- Funciones que un visitante sin sesión puede ejecutar a propósito (ADR-018; DATABASE.md §6)
anon_allowed(name) as (values ('map_aggregates'), ('map_features'), ('report_hotspots'), ('search_all'), ('track_engagement')),
fn as (
  select p.oid, n.nspname as schema, p.proname as name, p.prosecdef as definer, p.proconfig
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname in ('public', 'private')
    and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
)
select problem, object from (
  -- 1. Toda tabla de public tiene RLS
  select 'tabla de public sin RLS' as problem, c.relname::text as object
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity
  union all
  -- 2. Ningún cliente toca las tablas de private (cola, límites, transiciones)
  select 'tabla de private con permisos para clientes', (table_name || ' → ' || grantee || ' ' || privilege_type)::text
  from information_schema.role_table_grants
  where table_schema = 'private' and grantee in ('anon', 'authenticated', 'PUBLIC')
  union all
  -- 3. Un visitante sin sesión nunca escribe tablas directamente
  select 'anon puede escribir una tabla', (table_name || ' ' || privilege_type)::text
  from information_schema.role_table_grants
  where table_schema = 'public' and grantee = 'anon' and privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE')
  union all
  -- 4. Toda función SECURITY DEFINER fija su search_path (sin secuestro por objetos con el mismo nombre)
  select 'función SECURITY DEFINER sin search_path', (schema || '.' || name)::text
  from fn
  where definer and not exists (select 1 from unnest(coalesce(proconfig, '{}')) x where x like 'search_path=%')
  union all
  -- 5. anon solo ejecuta la lista permitida
  select 'anon puede ejecutar una función no permitida', (schema || '.' || name)::text
  from fn
  where schema = 'public' and has_function_privilege('anon', oid, 'execute')
    and name not in (select name from anon_allowed)
  union all
  -- 6. Las funciones del worker y las de preparar las E2E solo las ejecuta service_role
  select 'función del worker ejecutable por clientes', (schema || '.' || name)::text
  from fn
  where schema = 'public' and (name like 'worker\_%' or name like 'e2e\_%' or name = 'weekly_report_finish')
    and (has_function_privilege('anon', oid, 'execute') or has_function_privilege('authenticated', oid, 'execute'))
  union all
  -- 7. Ningún cliente crea objetos en los esquemas de la app
  select 'un cliente puede crear objetos en un esquema', (s || ' → ' || r)::text
  from unnest(array['public', 'private', 'extensions']) s, unnest(array['anon', 'authenticated']) r
  where exists (select 1 from pg_namespace where nspname = s) and has_schema_privilege(r, s, 'create')
  union all
  -- 8. Los roles de cliente nunca saltan RLS
  select 'rol de cliente que salta RLS', rolname::text
  from pg_roles where rolname in ('anon', 'authenticated', 'authenticator') and (rolbypassrls or rolsuper)
  union all
  -- 9. Ninguna tabla se publica por Realtime (el tránsito usa broadcast, no tablas)
  select 'tabla publicada por Realtime', (schemaname || '.' || tablename)::text
  from pg_publication_tables where pubname = 'supabase_realtime'
  union all
  -- 10. La evidencia de reportes y los PDF nunca son públicos
  select 'bucket privado marcado como público', id::text
  from storage.buckets where id in ('report-evidence', 'reports-pdf') and public
  union all
  -- 11. Nadie puede listar el bucket público (las fotos se sirven por URL pública, §5.19)
  select 'política de lectura que permite listar public-media', polname::text
  from pg_policy
  where polrelid = 'storage.objects'::regclass and polcmd in ('r', '*')
    and pg_get_expr(polqual, polrelid) like '%public-media%'
) problems
order by problem, object;
