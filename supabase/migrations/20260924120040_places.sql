-- =====================================================================
-- SR Conecta · 040 · Negocios, promociones, lugares turísticos y rutas de ecoturismo
-- Referencia: DATABASE.md §5.4 · ARCHITECTURE.md §22, §23 · Bases F1, F2, F3
-- =====================================================================
set search_path = public, extensions;

-- ---------------------------------------------------------------------
-- Negocios (F2: "registro abierto ... categorías, fotos, horarios y datos de contacto")
-- ---------------------------------------------------------------------
create table public.businesses (
  id               uuid primary key default gen_random_uuid(),
  province_id      uuid not null references public.provinces (id) on delete restrict,
  municipality_id  uuid not null,
  category_id      uuid not null references public.business_categories (id) on delete restrict,
  slug             text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 90),
  name             text not null check (char_length(name) between 2 and 120),
  description      text check (char_length(description) <= 2000),
  translations     jsonb not null default '{}'::jsonb check (jsonb_typeof(translations) = 'object'),
  geom             geometry(Point, 4326) not null,
  address          text check (char_length(address) <= 200),
  phone            text check (phone ~ '^\+?[0-9 ()-]{7,20}$'),
  whatsapp         text check (whatsapp ~ '^\+?[0-9 ()-]{7,20}$'),
  email            text check (char_length(email) <= 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  website          text check (char_length(website) <= 300 and website ~* '^https://'),
  google_place_id  text check (char_length(google_place_id) <= 300),
  status           text not null default 'pending'
                   check (status in ('draft', 'pending', 'under_review', 'approved', 'rejected', 'suspended', 'archived')),
  status_reason    text check (char_length(status_reason) <= 500),
  created_by       uuid references public.profiles (id) on delete set null,
  idempotency_key  text check (char_length(idempotency_key) between 8 and 64),
  version          integer not null default 1 check (version > 0),
  search_vector    tsvector generated always as (
                     setweight(to_tsvector('spanish', private.f_unaccent(coalesce(name, ''))), 'A') ||
                     setweight(to_tsvector('spanish', private.f_unaccent(coalesce(description, ''))), 'C')) stored,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz,
  foreign key (municipality_id, province_id) references public.municipalities (id, province_id),
  constraint businesses_slug_unique unique (province_id, slug),
  constraint businesses_idempotency_unique unique (created_by, idempotency_key),
  constraint businesses_reason_required check (status not in ('rejected', 'suspended') or status_reason is not null)
);
create index businesses_geom_gix      on public.businesses using gist (geom);
create index businesses_geog_gix      on public.businesses using gist ((geom::geography));
create index businesses_search_gin    on public.businesses using gin (search_vector);
create index businesses_name_trgm     on public.businesses using gin (private.f_unaccent(name) gin_trgm_ops);
create index businesses_public_idx    on public.businesses (municipality_id, category_id) where status = 'approved' and deleted_at is null;
create index businesses_moderation_idx on public.businesses (status, created_at) where status in ('pending', 'under_review');
create trigger businesses_version before update on public.businesses
  for each row execute function private.bump_version();

create table public.business_members (
  business_id  uuid not null references public.businesses (id) on delete cascade,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  member_role  text not null default 'owner' check (member_role in ('owner', 'staff')),
  created_at   timestamptz not null default now(),
  primary key (business_id, user_id)
);
create index business_members_user_idx on public.business_members (user_id);

create or replace function private.is_business_member(p_business_id uuid, p_owner_only boolean default false)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.business_members bm
                 where bm.business_id = p_business_id and bm.user_id = (select auth.uid())
                   and (not p_owner_only or bm.member_role = 'owner'))
$$;

-- Horarios normalizados: permiten "abierto ahora" con índice y validan rangos (jsonb no)
create table public.business_hours (
  business_id  uuid not null references public.businesses (id) on delete cascade,
  weekday      smallint not null check (weekday between 0 and 6),   -- 0 = domingo (extract(dow))
  opens        time not null,
  closes       time not null,
  primary key (business_id, weekday, opens),
  check (opens <> closes)   -- closes < opens = cierra después de medianoche
);

-- Promociones informativas (sin stock, códigos ni canje: ADR-011 retirado)
create table public.promotions (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses (id) on delete cascade,
  title        text not null check (char_length(title) between 3 and 120),
  description  text check (char_length(description) <= 500),
  valid_from   date not null,
  valid_until  date not null,
  status       text not null default 'pending' check (status in ('pending', 'active', 'rejected', 'paused')),
  created_by   uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  check (valid_until >= valid_from and valid_until <= valid_from + 90)
);
create index promotions_business_idx on public.promotions (business_id, status, valid_until);
create trigger promotions_updated_at before update on public.promotions
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------
-- Lugares turísticos (F1: "cualquier usuario puede ... agregar puntos de interés" → propuesta moderada)
-- ---------------------------------------------------------------------
create table public.tourism_places (
  id               uuid primary key default gen_random_uuid(),
  province_id      uuid not null references public.provinces (id) on delete restrict,
  municipality_id  uuid not null,
  slug             text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 90),
  name             text not null check (char_length(name) between 2 and 120),
  kind             text not null check (kind in ('mirador', 'rio_balneario', 'cultural', 'historico', 'agroturismo', 'naturaleza', 'otro')),
  description      text check (char_length(description) <= 3000),
  translations     jsonb not null default '{}'::jsonb check (jsonb_typeof(translations) = 'object'),
  services         jsonb not null default '{}'::jsonb check (jsonb_typeof(services) = 'object'),
  accessibility    text check (char_length(accessibility) <= 500),
  opening_info     text check (char_length(opening_info) <= 300),
  geom             geometry(Point, 4326) not null,
  status           text not null default 'pending' check (status in ('pending', 'published', 'rejected', 'archived')),
  status_reason    text check (char_length(status_reason) <= 500),
  proposed_by      uuid references public.profiles (id) on delete set null,
  reviewed_by      uuid references public.profiles (id) on delete set null,
  version          integer not null default 1 check (version > 0),
  search_vector    tsvector generated always as (
                     setweight(to_tsvector('spanish', private.f_unaccent(coalesce(name, ''))), 'A') ||
                     setweight(to_tsvector('spanish', private.f_unaccent(coalesce(description, ''))), 'C')) stored,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz,
  foreign key (municipality_id, province_id) references public.municipalities (id, province_id),
  constraint tourism_places_slug_unique unique (province_id, slug),
  check (status <> 'rejected' or status_reason is not null)
);
create index tourism_places_geom_gix   on public.tourism_places using gist (geom);
create index tourism_places_geog_gix   on public.tourism_places using gist ((geom::geography));
create index tourism_places_search_gin on public.tourism_places using gin (search_vector);
create index tourism_places_name_trgm  on public.tourism_places using gin (private.f_unaccent(name) gin_trgm_ops);
create index tourism_places_pending_idx on public.tourism_places (created_at) where status = 'pending';
create trigger tourism_places_version before update on public.tourism_places
  for each row execute function private.bump_version();

-- ---------------------------------------------------------------------
-- Rutas de ecoturismo (F3: "trazado y consulta ... dificultad, duración y servicios")
-- Derivados calculados por la base (columnas generadas): nadie puede enviar una distancia falsa.
-- ---------------------------------------------------------------------
create table public.eco_routes (
  id               uuid primary key default gen_random_uuid(),
  province_id      uuid not null references public.provinces (id) on delete restrict,
  municipality_id  uuid not null,              -- municipio del punto de inicio
  municipality_ids uuid[] not null default '{}',  -- todos los que cruza (trigger)
  slug             text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 90),
  name             text not null check (char_length(name) between 2 and 120),
  kind             text not null check (kind in ('ecologica', 'cultural', 'aventura')),
  difficulty       text not null check (difficulty in ('baja', 'media', 'alta')),
  duration_min     integer not null check (duration_min between 5 and 2880),
  description      text check (char_length(description) <= 3000),
  services         jsonb not null default '{}'::jsonb check (jsonb_typeof(services) = 'object'),
  translations     jsonb not null default '{}'::jsonb check (jsonb_typeof(translations) = 'object'),
  geom             geometry(MultiLineString, 4326) not null
                   check (st_isvalid(geom) and st_npoints(geom) between 2 and 5000),
  geom_simplified  geometry(MultiLineString, 4326)
                   generated always as (st_multi(st_simplifypreservetopology(geom, 0.00005))) stored,
  start_point      geometry(Point, 4326) generated always as (st_startpoint(st_geometryn(geom, 1))) stored,
  distance_km      numeric(7, 2) generated always as (round((st_length(geom::geography) / 1000)::numeric, 2)) stored,
  status           text not null default 'pending' check (status in ('pending', 'published', 'rejected', 'archived')),
  status_reason    text check (char_length(status_reason) <= 500),
  proposed_by      uuid references public.profiles (id) on delete set null,
  reviewed_by      uuid references public.profiles (id) on delete set null,
  version          integer not null default 1 check (version > 0),
  search_vector    tsvector generated always as (
                     setweight(to_tsvector('spanish', private.f_unaccent(coalesce(name, ''))), 'A') ||
                     setweight(to_tsvector('spanish', private.f_unaccent(coalesce(description, ''))), 'C')) stored,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz,
  foreign key (municipality_id, province_id) references public.municipalities (id, province_id),
  constraint eco_routes_slug_unique unique (province_id, slug),
  check (status <> 'rejected' or status_reason is not null)
);
create index eco_routes_geom_gix   on public.eco_routes using gist (geom);
create index eco_routes_start_gix  on public.eco_routes using gist ((start_point::geography));
create index eco_routes_search_gin on public.eco_routes using gin (search_vector);
create index eco_routes_munis_gin  on public.eco_routes using gin (municipality_ids);
create trigger eco_routes_version before update on public.eco_routes
  for each row execute function private.bump_version();

create or replace function private.eco_routes_set_municipalities()
returns trigger language plpgsql set search_path = pg_catalog, extensions, public as $$
begin
  new.municipality_ids := coalesce((select array_agg(m.id order by m.name)
                                    from public.municipalities m
                                    where st_intersects(m.geom, new.geom)), '{}');
  return new;
end $$;
create trigger eco_routes_municipalities before insert or update of geom on public.eco_routes
  for each row execute function private.eco_routes_set_municipalities();

-- ---------------------------------------------------------------------
-- Métricas de interacción por día (panel del comercio: vistas, "cómo llegar", WhatsApp)
-- Agregadas: nunca una fila por evento.
-- ---------------------------------------------------------------------
create table public.engagement_daily (
  day          date not null,
  entity_type  text not null check (entity_type in ('business', 'tourism_place', 'eco_route')),
  entity_id    uuid not null,
  metric       text not null check (metric in ('view', 'directions', 'whatsapp')),
  count        integer not null default 0 check (count >= 0),
  primary key (entity_type, entity_id, metric, day)
);
