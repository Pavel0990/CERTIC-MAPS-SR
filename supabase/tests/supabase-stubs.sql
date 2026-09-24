-- =====================================================================
-- Stubs mínimos de lo que Supabase aporta a la base, para probar las migraciones SIN Docker
-- (PGlite = PostgreSQL 18 + PostGIS en WebAssembly). Solo para pruebas: NO se aplica en Supabase.
-- Reproduce: roles de la API, auth.users/auth.uid(), storage.*, realtime.send, vault, net.
-- =====================================================================
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;

create schema auth;
create table auth.users (
  id                  uuid primary key default gen_random_uuid(),
  email               text,
  raw_user_meta_data  jsonb not null default '{}'::jsonb,
  created_at          timestamptz not null default now()
);
-- Igual que Supabase: el sujeto sale de los claims del JWT de la petición
create function auth.uid() returns uuid language sql stable as $$
  select nullif(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub', '')::uuid
$$;
grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;

create schema storage;
create table storage.buckets (
  id text primary key, name text not null, public boolean not null default false,
  file_size_limit bigint, allowed_mime_types text[]
);
create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets (id), name text not null, owner uuid,
  created_at timestamptz not null default now()
);
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql immutable as $$
  select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1]
$$;
grant usage on schema storage to anon, authenticated, service_role;
grant select, insert on storage.objects to anon, authenticated;
grant execute on function storage.foldername(text) to anon, authenticated;

create schema realtime;
create table realtime.sent (topic text, event text, payload jsonb, at timestamptz default now());
create function realtime.send(payload jsonb, event text, topic text, private boolean default true)
returns void language sql as $$ insert into realtime.sent (topic, event, payload) values (topic, event, payload) $$;

create schema vault;
create table vault.secrets_stub (name text primary key, decrypted_secret text);
create view vault.decrypted_secrets as select name, decrypted_secret from vault.secrets_stub;

create schema net;
create table net.requests (url text, headers jsonb, body jsonb, at timestamptz default now());
create function net.http_post(url text, body jsonb default '{}'::jsonb, params jsonb default '{}'::jsonb,
                              headers jsonb default '{}'::jsonb, timeout_milliseconds integer default 5000)
returns bigint language sql as $$ insert into net.requests (url, headers, body) values (url, headers, body); select 1::bigint $$;
