-- =====================================================================
-- SR Conecta · 000 · Cimientos: extensiones, esquemas, privilegios base y utilidades
-- Referencia: DATABASE.md §2–§4
-- =====================================================================
set search_path = public, extensions;

-- Extensiones en su propio esquema (convención de Supabase): no ensucian `public`
create schema if not exists extensions;
create extension if not exists postgis  with schema extensions;
create extension if not exists pg_trgm  with schema extensions;
create extension if not exists unaccent with schema extensions;
create extension if not exists pgcrypto with schema extensions;
-- Explícito (Supabase lo concede por defecto, pero no dependemos de ello): sin USAGE, las funciones
-- SECURITY INVOKER que usan tipos PostGIS fallan para anon/authenticated ("type geometry does not exist").
grant usage on schema extensions to anon, authenticated, service_role;

-- Esquema interno: NO se expone por la Data API (no figura en "Exposed schemas").
-- USAGE sí se concede, porque las políticas RLS llaman helpers de aquí con el rol del usuario.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated, service_role;

-- Nadie salvo el propietario crea objetos en `public` (defensa contra secuestro de search_path)
revoke create on schema public from public;

-- Las funciones nuevas NO son ejecutables por PUBLIC por defecto: cada RPC se concede explícitamente.
-- OJO: debe ser la forma GLOBAL (sin IN SCHEMA). Postgres concede EXECUTE a PUBLIC globalmente y
-- "ALTER DEFAULT PRIVILEGES IN SCHEMA ..." solo puede AÑADIR privilegios, no revocar los globales.
alter default privileges revoke execute on functions from public;

-- ---------------------------------------------------------------------
-- Utilidades genéricas
-- ---------------------------------------------------------------------

-- unaccent() no es IMMUTABLE; este envoltorio sí, con diccionario explícito.
-- Permite usarlo en columnas generadas e índices de expresión.
create or replace function private.f_unaccent(text)
returns text
language sql immutable parallel safe strict
set search_path = ''
as $$ select extensions.unaccent('extensions.unaccent'::regdictionary, $1) $$;

-- Respuesta estándar de rechazo de negocio (se DEVUELVE; no se lanza: ver ARCHITECTURE.md §12)
create or replace function private.reject(p_reason text, p_extra jsonb default '{}'::jsonb)
returns jsonb
language sql immutable
set search_path = ''
as $$ select jsonb_build_object('status', 'rejected', 'reason', p_reason) || coalesce(p_extra, '{}'::jsonb) $$;

-- ¿La llamada viene con la clave service_role? (worker y cron)
create or replace function private.is_service()
returns boolean
language sql stable
set search_path = ''
as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', '') = 'service_role'
$$;

-- Punto WGS84 validado; NULL si las coordenadas no son válidas
create or replace function private.make_point(p_lat double precision, p_lng double precision)
returns extensions.geometry
language sql immutable
set search_path = ''
as $$
  select case
    when p_lat is null or p_lng is null
      or p_lat = 'NaN'::float8 or p_lng = 'NaN'::float8
      or p_lat not between -90 and 90 or p_lng not between -180 and 180
    then null
    else extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)
  end
$$;

-- Identificador público estable a partir de un nombre ("Café Monción" → "cafe-moncion")
create or replace function private.slugify(p_text text)
returns text
language sql immutable
set search_path = ''
as $$
  select nullif(trim(both '-' from regexp_replace(lower(private.f_unaccent(coalesce(p_text, ''))), '[^a-z0-9]+', '-', 'g')), '')
$$;

-- Triggers genéricos
create or replace function private.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create or replace function private.bump_version()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.version := old.version + 1;
  new.updated_at := now();
  return new;
end $$;
