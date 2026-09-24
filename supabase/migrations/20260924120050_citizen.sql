-- =====================================================================
-- SR Conecta · 050 · Participación ciudadana: consultas/incidencias, votos, historial, tránsito
-- Referencia: DATABASE.md §5.5 · ARCHITECTURE.md §21 · Bases F4, F5
-- =====================================================================
set search_path = public, extensions;

-- ---------------------------------------------------------------------
-- Incidencias y consultas municipales (F5)
-- ---------------------------------------------------------------------
create table public.citizen_requests (
  id                uuid primary key default gen_random_uuid(),
  province_id       uuid not null references public.provinces (id) on delete restrict,
  municipality_id   uuid not null,
  requester_id      uuid references public.profiles (id) on delete set null,
  kind              text not null check (kind in ('incident', 'inquiry')),
  category          text not null,
  title             text not null check (char_length(title) between 3 and 120),
  description       text not null check (char_length(description) between 10 and 2000),
  geom              geometry(Point, 4326),
  status            text not null default 'pending'
                    check (status in ('pending', 'under_review', 'approved', 'rejected', 'in_progress', 'resolved', 'archived')),
  assigned_to       uuid references public.profiles (id) on delete set null,
  is_public         boolean not null default false,
  support_count     integer not null default 0 check (support_count >= 0),
  resolution_note   text check (char_length(resolution_note) <= 1000),
  rejection_reason  text check (char_length(rejection_reason) <= 500),
  idempotency_key   text check (char_length(idempotency_key) between 8 and 64),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  foreign key (municipality_id, province_id) references public.municipalities (id, province_id),
  -- la categoría debe ser del mismo tipo (una consulta no usa una categoría de incidencia)
  foreign key (category, kind) references public.request_categories (code, kind),
  constraint citizen_requests_idempotency_unique unique (requester_id, idempotency_key),
  check (kind = 'inquiry' or geom is not null),
  check (status <> 'resolved' or resolution_note is not null),
  check (status <> 'rejected' or rejection_reason is not null)
  -- "in_progress exige assigned_to" se valida en la RPC, NO con CHECK: assigned_to es ON DELETE SET NULL
  -- y un CHECK así impediría borrar la cuenta del empleado asignado.
);
create index citizen_requests_geom_gix    on public.citizen_requests using gist (geom) where geom is not null;
create index citizen_requests_inbox_idx   on public.citizen_requests (municipality_id, status, support_count desc, created_at);
create index citizen_requests_requester_idx on public.citizen_requests (requester_id, created_at desc);
create index citizen_requests_public_idx  on public.citizen_requests (municipality_id, support_count desc)
  where is_public and status in ('approved', 'in_progress', 'resolved');
create trigger citizen_requests_updated_at before update on public.citizen_requests
  for each row execute function private.set_updated_at();

-- Historial inmutable de estados (tiempos de resolución y trazabilidad)
create table public.request_status_history (
  id           bigint generated always as identity primary key,
  request_id   uuid not null references public.citizen_requests (id) on delete cascade,
  from_status  text,
  to_status    text not null,
  changed_by   uuid references public.profiles (id) on delete set null,
  note         text check (char_length(note) <= 1000),
  created_at   timestamptz not null default now()
);
create index request_status_history_request_idx on public.request_status_history (request_id, created_at);

-- Votos de prioridad (F5: "voten prioridades"): uno por usuario y consulta
create table public.request_votes (
  request_id  uuid not null references public.citizen_requests (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (request_id, user_id)
);
create index request_votes_user_idx on public.request_votes (user_id);

-- El contador lo mantiene la base, nunca el cliente
create or replace function private.request_votes_count()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    update public.citizen_requests set support_count = support_count + 1 where id = new.request_id;
  else
    update public.citizen_requests set support_count = greatest(support_count - 1, 0) where id = old.request_id;
  end if;
  return null;
end $$;
create trigger request_votes_count after insert or delete on public.request_votes
  for each row execute function private.request_votes_count();

-- ---------------------------------------------------------------------
-- Reportes de tránsito (F4): temporales, expiran; pueden escalarse a incidencia municipal
-- ---------------------------------------------------------------------
create table public.traffic_reports (
  id                    uuid primary key default gen_random_uuid(),
  province_id           uuid not null references public.provinces (id) on delete restrict,
  municipality_id       uuid,
  reporter_id           uuid references public.profiles (id) on delete set null,
  type                  text not null references public.traffic_report_types (code),
  severity              smallint not null check (severity between 1 and 3),
  description           text check (char_length(description) <= 500),
  geom                  geometry(Point, 4326) not null,
  status                text not null default 'pending'
                        check (status in ('pending', 'active', 'verified', 'resolved', 'rejected', 'expired', 'out_of_area')),
  expires_at            timestamptz not null,
  escalated_request_id  uuid references public.citizen_requests (id) on delete set null,
  idempotency_key       text check (char_length(idempotency_key) between 8 and 64),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  foreign key (municipality_id, province_id) references public.municipalities (id, province_id),
  constraint traffic_reports_idempotency_unique unique (reporter_id, idempotency_key),
  -- sin municipio solo si está fuera del área (o ya se rechazó por eso)
  check (municipality_id is not null or status in ('out_of_area', 'rejected')),
  check (expires_at > created_at)
);
create index traffic_reports_geom_gix   on public.traffic_reports using gist (geom);
-- capa pública del mapa: solo activos, filtrados siempre por expires_at > now()
create index traffic_reports_live_idx   on public.traffic_reports (expires_at) where status in ('active', 'verified');
create index traffic_reports_inbox_idx  on public.traffic_reports (municipality_id, status, created_at);
create index traffic_reports_reporter_idx on public.traffic_reports (reporter_id, created_at desc);
create trigger traffic_reports_updated_at before update on public.traffic_reports
  for each row execute function private.set_updated_at();
