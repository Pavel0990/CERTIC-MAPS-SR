-- =====================================================================
-- SR Conecta · 010 · Territorio: provincias, municipios, feature flags
-- Referencia: DATABASE.md §5.1 · ARCHITECTURE.md §5.1, §11
-- =====================================================================
set search_path = public, extensions;

create table public.provinces (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique check (code ~ '^[A-Z0-9_]{2,20}$'),
  name        text not null check (char_length(name) between 2 and 120),
  created_at  timestamptz not null default now()
);
comment on table public.provinces is 'Territorio raíz. Una fila en el MVP (Santiago Rodríguez); multi-provincia sin migración (ARCHITECTURE.md §5.1).';

create table public.municipalities (
  id               uuid primary key default gen_random_uuid(),
  province_id      uuid not null references public.provinces (id) on delete restrict,
  code             text not null check (code ~ '^[A-Z0-9_]{2,20}$'),
  name             text not null check (char_length(name) between 2 and 120),
  geom             geometry(MultiPolygon, 4326) not null check (st_isvalid(geom)),
  -- Simplificación topológica hecha en la importación (mapshaper / ST_CoverageSimplify), no por polígono
  geom_simplified  geometry(MultiPolygon, 4326),
  created_at       timestamptz not null default now(),
  unique (province_id, code),
  -- Destino de las FK compuestas (municipality_id, province_id): garantiza que el municipio pertenece a la provincia
  unique (id, province_id)
);
create index municipalities_geom_gix on public.municipalities using gist (geom);
comment on table public.municipalities is 'Límites oficiales importados de los datos abiertos de la provincia (ogr2ogr → staging → ST_MakeValid → aquí).';

create table public.feature_flags (
  id               bigint generated always as identity primary key,
  key              text not null check (key ~ '^[a-z0-9_.]{2,60}$'),
  province_id      uuid not null references public.provinces (id) on delete cascade,
  municipality_id  uuid,
  enabled          boolean not null default false,
  config           jsonb not null default '{}'::jsonb check (jsonb_typeof(config) = 'object'),
  updated_at       timestamptz not null default now(),
  foreign key (municipality_id, province_id) references public.municipalities (id, province_id) on delete cascade,
  unique nulls not distinct (key, province_id, municipality_id)
);
create trigger feature_flags_updated_at before update on public.feature_flags
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------
-- Ubicación → municipio/provincia (ARCHITECTURE.md §11.1)
-- 1) municipio que CUBRE el punto (ST_Covers incluye el borde; ST_Contains no)
-- 2) si no, el más cercano a ≤ 2 km (imprecisión del GPS o de los límites)
-- 3) si no, ninguna fila → el llamador decide (out_of_area / rechazo)
-- ---------------------------------------------------------------------
create or replace function private.locate(p_geom geometry)
returns table (municipality_id uuid, province_id uuid)
language sql stable
set search_path = pg_catalog, extensions, public
as $$
  select x.id, x.province_id
  from (
    select m.id, m.province_id, 0 as prio, 0::float8 as dist
    from public.municipalities m
    where st_covers(m.geom, p_geom)
    union all
    select m.id, m.province_id, 1, st_distance(m.geom::geography, p_geom::geography)
    from public.municipalities m
    where st_dwithin(m.geom::geography, p_geom::geography, 2000)
  ) x
  order by x.prio, x.dist
  limit 1
$$;

create or replace function private.default_province_id()
returns uuid
language sql stable
set search_path = ''
as $$ select id from public.provinces order by created_at, id limit 1 $$;
