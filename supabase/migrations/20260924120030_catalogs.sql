-- =====================================================================
-- SR Conecta · 030 · Catálogos y datos de referencia (configurables sin deploy)
-- Referencia: DATABASE.md §5.3 · ARCHITECTURE.md §5.1, §21
-- Los datos de referencia viven en migraciones (son necesarios en producción); los datos demo, en seed.sql.
-- =====================================================================
set search_path = public, extensions;

create table public.business_categories (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 40),
  name          text not null check (char_length(name) between 2 and 60),
  icon          text not null default 'store' check (icon ~ '^[a-z0-9-]{2,30}$'),
  translations  jsonb not null default '{}'::jsonb check (jsonb_typeof(translations) = 'object'),
  sort          smallint not null default 0,
  active        boolean not null default true
);

-- Tipos de reporte de tránsito (bases, F4: "accidentes, cierres, baches, semáforos dañados y desvíos")
create table public.traffic_report_types (
  code              text primary key check (code ~ '^[a-z_]{2,30}$'),
  name              text not null check (char_length(name) between 2 and 60),
  icon              text not null check (icon ~ '^[a-z0-9-]{2,30}$'),
  default_severity  smallint not null check (default_severity between 1 and 3),
  default_ttl       interval not null check (default_ttl between interval '15 minutes' and interval '30 days'),
  sort              smallint not null default 0,
  active            boolean not null default true
);

-- Categorías de incidencias y consultas municipales (bases, F5)
create table public.request_categories (
  code    text primary key check (code ~ '^[a-z_]{2,30}$'),
  kind    text not null check (kind in ('incident', 'inquiry')),
  name    text not null check (char_length(name) between 2 and 60),
  icon    text not null check (icon ~ '^[a-z0-9-]{2,30}$'),
  sort    smallint not null default 0,
  active  boolean not null default true,
  -- destino de la FK compuesta (category, kind): una consulta no puede usar una categoría de incidencia
  unique (code, kind)
);

-- Transiciones válidas de consultas/incidencias (ARCHITECTURE.md §21.1). Configuración interna: esquema private.
create table private.request_transitions (
  from_status  text not null,
  to_status    text not null,
  min_role     text not null check (min_role in ('moderator', 'municipal_admin', 'system')),
  primary key (from_status, to_status)
);

-- Transiciones de reportes de tránsito
create table private.traffic_transitions (
  from_status  text not null,
  to_status    text not null,
  primary key (from_status, to_status)
);

-- Transiciones de contenido moderado (negocios, lugares, rutas, promociones)
create table private.content_transitions (
  entity       text not null check (entity in ('business', 'place', 'route', 'promotion', 'attachment')),
  from_status  text not null,
  to_status    text not null,
  primary key (entity, from_status, to_status)
);

-- Reglas de rate limit por acción (ventana fija)
create table private.rate_limit_rules (
  action       text primary key check (action ~ '^[a-z_]{2,40}$'),
  max_count    integer not null check (max_count > 0),
  window_size  interval not null check (window_size between interval '1 minute' and interval '1 day')
);

-- ---------------------------------------------------------------------
-- Datos de referencia
-- ---------------------------------------------------------------------
insert into public.traffic_report_types (code, name, icon, default_severity, default_ttl, sort) values
  ('accidente',    'Accidente',              'car-crash',     3, interval '3 hours',  10),
  ('calle_cerrada','Calle cerrada',          'road-block',    2, interval '12 hours', 20),
  ('bache',        'Bache',                  'pothole',       2, interval '7 days',   30),
  ('semaforo',     'Semáforo o señal dañada','traffic-light', 2, interval '2 days',   40),
  ('desvio',       'Desvío',                 'detour',        1, interval '2 days',   50),
  ('derrumbe',     'Derrumbe',               'landslide',     3, interval '2 days',   60),
  ('via_inundada', 'Vía inundada',           'flood',         3, interval '12 hours', 70),
  ('obra',         'Obra en la vía',         'cone',          1, interval '7 days',   80),
  ('otro',         'Otro',                   'alert',         1, interval '6 hours',  90);

insert into public.request_categories (code, kind, name, icon, sort) values
  ('basura',          'incident', 'Basura',                 'trash',        10),
  ('alumbrado',       'incident', 'Alumbrado',              'lightbulb',    20),
  ('infraestructura', 'incident', 'Infraestructura',        'hammer',       30),
  ('agua',            'incident', 'Agua y drenaje',         'droplet',      40),
  ('otro_incidente',  'incident', 'Otro problema',          'alert',        50),
  ('consulta',        'inquiry',  'Consulta',               'help-circle',  60),
  ('queja',           'inquiry',  'Queja',                  'message',      70),
  ('propuesta',       'inquiry',  'Propuesta para el municipio', 'lightbulb-on', 80);

insert into public.business_categories (slug, name, icon, sort) values
  ('colmado', 'Colmado', 'store', 10), ('restaurante', 'Restaurante', 'utensils', 20),
  ('cafeteria', 'Cafetería', 'coffee', 30), ('hotel', 'Hotel y alojamiento', 'bed', 40),
  ('agroturismo', 'Agroturismo', 'leaf', 50), ('artesania', 'Artesanía', 'palette', 60),
  ('servicios', 'Servicios', 'wrench', 70), ('salud', 'Farmacia y salud', 'pill', 80),
  ('otro', 'Otro', 'store', 90);

insert into private.request_transitions (from_status, to_status, min_role) values
  ('pending',      'under_review', 'moderator'),
  ('under_review', 'approved',     'moderator'),
  ('approved',     'in_progress',  'moderator'),
  ('in_progress',  'resolved',     'moderator'),
  ('resolved',     'archived',     'municipal_admin'),
  ('pending',      'rejected',     'moderator'),
  ('under_review', 'rejected',     'moderator'),
  ('approved',     'rejected',     'moderator');

insert into private.traffic_transitions (from_status, to_status) values
  ('pending', 'active'), ('pending', 'rejected'),
  ('active', 'verified'), ('active', 'resolved'), ('active', 'rejected'),
  ('verified', 'resolved'), ('out_of_area', 'rejected');

insert into private.content_transitions (entity, from_status, to_status) values
  ('business', 'pending', 'under_review'), ('business', 'pending', 'rejected'),
  ('business', 'under_review', 'approved'), ('business', 'under_review', 'rejected'),
  ('business', 'approved', 'suspended'), ('business', 'approved', 'archived'),
  ('business', 'suspended', 'approved'), ('business', 'suspended', 'archived'),
  ('business', 'rejected', 'archived'),
  ('place', 'pending', 'published'), ('place', 'pending', 'rejected'), ('place', 'published', 'archived'),
  ('route', 'pending', 'published'), ('route', 'pending', 'rejected'), ('route', 'published', 'archived'),
  ('promotion', 'pending', 'active'), ('promotion', 'pending', 'rejected'),
  ('promotion', 'active', 'paused'), ('promotion', 'paused', 'active'),
  -- fotos de contenido público (negocio, lugar, ruta): el worker las deja en 'processed' y el moderador publica
  ('attachment', 'processed', 'approved'), ('attachment', 'processed', 'rejected'), ('attachment', 'approved', 'rejected');

insert into private.rate_limit_rules (action, max_count, window_size) values
  ('traffic_report_create', 5,  interval '1 hour'),
  ('request_create',        5,  interval '1 hour'),
  ('request_vote',          30, interval '1 hour'),
  ('business_submit',       3,  interval '1 day'),
  ('business_update',       30, interval '1 hour'),
  ('proposal_create',       5,  interval '1 day'),
  ('staff_action',          300, interval '1 hour'),
  ('attachment_register',   30,  interval '1 hour'),
  ('content_update',        30,  interval '1 hour'),
  ('role_change',           30, interval '1 hour');
