-- =====================================================================
-- SR Conecta · 060 · Adjuntos, moderación y auditoría
-- Referencia: DATABASE.md §5.6 · ARCHITECTURE.md §17 (uploads), §33 (auditoría)
-- =====================================================================
set search_path = public, extensions;

-- Adjuntos con "arco exclusivo": una FK real por entidad y exactamente una no nula.
-- Sustituye al diseño polimórfico (entity_type + entity_id) que no admitía FK ni cascadas.
create table public.attachments (
  id                  uuid primary key default gen_random_uuid(),
  owner_id            uuid references public.profiles (id) on delete set null,
  business_id         uuid references public.businesses (id) on delete cascade,
  tourism_place_id    uuid references public.tourism_places (id) on delete cascade,
  eco_route_id        uuid references public.eco_routes (id) on delete cascade,
  traffic_report_id   uuid references public.traffic_reports (id) on delete cascade,
  citizen_request_id  uuid references public.citizen_requests (id) on delete cascade,
  bucket              text not null check (bucket in ('public-media', 'report-evidence')),
  -- ruta generada por el servidor ({uuid}.webp); nunca el nombre enviado por el cliente
  path                text not null unique check (path ~ '^[a-z0-9_-]+(/[a-z0-9_-]+)*\.(webp|jpg|jpeg|png)$'),
  mime                text not null check (mime in ('image/webp', 'image/jpeg', 'image/png')),
  bytes               integer not null check (bytes between 1 and 5242880),
  width               smallint check (width between 1 and 4096),
  height              smallint check (height between 1 and 4096),
  status              text not null default 'pending' check (status in ('pending', 'processed', 'approved', 'rejected')),
  created_at          timestamptz not null default now(),
  constraint attachments_one_parent check (
    num_nonnulls(business_id, tourism_place_id, eco_route_id, traffic_report_id, citizen_request_id) = 1)
);
create index attachments_business_idx on public.attachments (business_id) where business_id is not null;
create index attachments_place_idx    on public.attachments (tourism_place_id) where tourism_place_id is not null;
create index attachments_route_idx    on public.attachments (eco_route_id) where eco_route_id is not null;
create index attachments_traffic_idx  on public.attachments (traffic_report_id) where traffic_report_id is not null;
create index attachments_request_idx  on public.attachments (citizen_request_id) where citizen_request_id is not null;
create index attachments_pending_idx  on public.attachments (created_at) where status = 'pending';

-- Decisiones de moderación (inmutable)
create table public.moderation_actions (
  id            bigint generated always as identity primary key,
  moderator_id  uuid references public.profiles (id) on delete set null,
  entity_type   text not null check (entity_type in ('business', 'tourism_place', 'eco_route', 'promotion',
                                                     'traffic_report', 'citizen_request', 'attachment', 'user_role')),
  entity_id     uuid not null,
  action        text not null check (action in ('status_change', 'assign', 'escalate', 'grant', 'revoke')),
  from_status   text,
  to_status     text,
  reason        text check (char_length(reason) <= 1000),
  created_at    timestamptz not null default now()
);
create index moderation_actions_entity_idx on public.moderation_actions (entity_type, entity_id, created_at);

-- Auditoría (inmutable). PK (created_at, id): lista para particionado mensual sin reescribir la tabla.
create table public.audit_logs (
  created_at       timestamptz not null default now(),
  id               bigint generated always as identity,
  province_id      uuid references public.provinces (id) on delete set null,
  municipality_id  uuid references public.municipalities (id) on delete set null,
  actor_id         uuid references public.profiles (id) on delete set null,
  actor_role       text not null,
  action           text not null check (action ~ '^[a-z_]+\.[a-z_]+$'),
  entity_type      text not null,
  entity_id        uuid,
  result           text not null default 'success' check (result in ('success', 'denied', 'error')),
  before           jsonb,
  after            jsonb,
  ip_observed      inet,   -- vista por Supabase (x-forwarded-for de PostgREST)
  ip_declared      inet,   -- enviada por Next.js: informativa, falsificable si la llamada es directa
  user_agent       text check (char_length(user_agent) <= 400),
  primary key (created_at, id)
);
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id, created_at desc);
create index audit_logs_actor_idx  on public.audit_logs (actor_id, created_at desc);
create index audit_logs_scope_idx  on public.audit_logs (province_id, municipality_id, created_at desc);

-- Escribe auditoría desde RPC y triggers. Nunca falla la operación principal por un error de lectura de cabeceras.
create or replace function private.audit(
  p_action text, p_entity_type text, p_entity_id uuid,
  p_before jsonb default null, p_after jsonb default null,
  p_result text default 'success', p_municipality_id uuid default null, p_ip_declared text default null)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_headers jsonb;
  v_ip inet;
  v_declared inet;
  v_province uuid;
begin
  begin
    v_headers := nullif(current_setting('request.headers', true), '')::jsonb;
    v_ip := nullif(btrim(split_part(v_headers ->> 'x-forwarded-for', ',', 1)), '')::inet;
  exception when others then v_ip := null;
  end;
  begin
    v_declared := nullif(p_ip_declared, '')::inet;
  exception when others then v_declared := null;
  end;
  select m.province_id into v_province from public.municipalities m where m.id = p_municipality_id;
  insert into public.audit_logs (province_id, municipality_id, actor_id, actor_role, action, entity_type, entity_id,
                                 result, before, after, ip_observed, ip_declared, user_agent)
  values (coalesce(v_province, private.default_province_id()), p_municipality_id, (select auth.uid()),
          private.current_role_label(), p_action, p_entity_type, p_entity_id, p_result, p_before, p_after,
          v_ip, v_declared, left(v_headers ->> 'user-agent', 400));
end $$;
