-- =====================================================================
-- SR Conecta · 070 · Notificaciones, cola de trabajos, rate limiting, informes semanales
-- Referencia: DATABASE.md §5.7–§5.8 · ARCHITECTURE.md §12, §25, §27, ADR-016
-- =====================================================================
set search_path = public, extensions;

-- ---------------------------------------------------------------------
-- Notificaciones (fuente de verdad in-app; push y email son canales de entrega)
-- ---------------------------------------------------------------------
create table public.notifications (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  kind         text not null check (kind in ('request_status', 'traffic_status', 'content_status', 'traffic_nearby', 'system')),
  title        text not null check (char_length(title) between 1 and 120),
  body         text check (char_length(body) <= 500),
  payload      jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  read_at      timestamptz,
  push_status  text not null default 'none' check (push_status in ('none', 'pending', 'sent', 'failed')),
  created_at   timestamptz not null default now()
);
create index notifications_user_idx   on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where read_at is null;

create table public.notification_preferences (
  user_id         uuid primary key references public.profiles (id) on delete cascade,
  push_enabled    boolean not null default false,
  email_enabled   boolean not null default true,
  topics          text[] not null default array['request_status', 'traffic_status', 'content_status', 'traffic_nearby']
                  check (topics <@ array['request_status', 'traffic_status', 'content_status', 'traffic_nearby', 'system']),
  municipalities  uuid[] not null default '{}',
  updated_at      timestamptz not null default now()
);
create trigger notification_preferences_updated_at before update on public.notification_preferences
  for each row execute function private.set_updated_at();

create table public.push_subscriptions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles (id) on delete cascade,
  endpoint         text not null unique check (endpoint ~ '^https://' and char_length(endpoint) <= 1000),
  p256dh           text not null check (char_length(p256dh) <= 200),
  auth             text not null check (char_length(auth) <= 100),
  user_agent       text check (char_length(user_agent) <= 400),
  last_success_at  timestamptz,
  created_at       timestamptz not null default now()
);
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

-- ---------------------------------------------------------------------
-- Cola de trabajos (outbox). Productores: RPC, triggers, pg_cron. Consumidor: worker Next.js.
-- ---------------------------------------------------------------------
create table private.jobs (
  id            bigint generated always as identity primary key,
  kind          text not null check (kind in ('push', 'email', 'image_process', 'publish_media', 'pdf_weekly', 'fanout_alert',
                                              'notify_moderators', 'delete_storage_object')),
  payload       jsonb not null default '{}'::jsonb,
  dedupe_key    text check (char_length(dedupe_key) <= 200),
  run_at        timestamptz not null default now(),
  attempts      smallint not null default 0,
  max_attempts  smallint not null default 5 check (max_attempts between 1 and 20),
  status        text not null default 'pending' check (status in ('pending', 'running', 'done', 'failed', 'dead')),
  locked_until  timestamptz,
  last_error    text check (char_length(last_error) <= 2000),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create unique index jobs_dedupe_active_uq on private.jobs (dedupe_key) where status in ('pending', 'running');
create index jobs_ready_idx on private.jobs (run_at) where status = 'pending';
create index jobs_running_idx on private.jobs (locked_until) where status = 'running';
create trigger jobs_updated_at before update on private.jobs
  for each row execute function private.set_updated_at();

create or replace function private.enqueue(p_kind text, p_payload jsonb, p_dedupe_key text default null,
                                           p_run_at timestamptz default now())
returns void
language sql security definer
set search_path = ''
as $$
  insert into private.jobs (kind, payload, dedupe_key, run_at)
  values (p_kind, coalesce(p_payload, '{}'::jsonb), p_dedupe_key, coalesce(p_run_at, now()))
  on conflict (dedupe_key) where status in ('pending', 'running') do nothing
$$;

-- Notificación in-app + job de push si el usuario tiene push activo
create or replace function private.notify(p_user uuid, p_kind text, p_title text, p_body text, p_payload jsonb default '{}'::jsonb)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_push boolean;
begin
  if p_user is null then return; end if;
  select coalesce(np.push_enabled, false) and p_kind = any (np.topics) into v_push
  from public.notification_preferences np where np.user_id = p_user;
  insert into public.notifications (user_id, kind, title, body, payload, push_status)
  values (p_user, p_kind, left(p_title, 120), left(p_body, 500), coalesce(p_payload, '{}'::jsonb),
          case when coalesce(v_push, false) then 'pending' else 'none' end)
  returning id into v_id;
  if coalesce(v_push, false) then
    perform private.enqueue('push', jsonb_build_object('notification_id', v_id), 'push:' || v_id);
  end if;
end $$;

-- ---------------------------------------------------------------------
-- Rate limiting (ventana fija). Devuelve TRUE si la acción está permitida.
-- El incremento se hace aunque luego la RPC rechace: por eso las RPC devuelven rechazos, no lanzan.
-- ---------------------------------------------------------------------
create table private.rate_limit_hits (
  user_id       uuid not null,
  action        text not null references private.rate_limit_rules (action) on delete cascade,
  window_start  timestamptz not null,
  count         integer not null default 0,
  primary key (user_id, action, window_start)
);

create or replace function private.hit_rate_limit(p_action text)
returns boolean
language plpgsql security definer
set search_path = ''
as $$
declare
  v_rule private.rate_limit_rules;
  v_uid uuid := (select auth.uid());
  v_secs double precision;
  v_window timestamptz;
  v_count integer;
begin
  if v_uid is null then return false; end if;
  select * into v_rule from private.rate_limit_rules where action = p_action;
  if not found then raise exception 'rate limit rule missing: %', p_action; end if;
  v_secs := extract(epoch from v_rule.window_size);
  v_window := to_timestamp(floor(extract(epoch from now()) / v_secs) * v_secs);
  insert into private.rate_limit_hits as h (user_id, action, window_start, count)
  values (v_uid, p_action, v_window, 1)
  on conflict (user_id, action, window_start) do update set count = h.count + 1
  returning h.count into v_count;
  return v_count <= v_rule.max_count;
end $$;

-- ---------------------------------------------------------------------
-- Informes semanales (F6). Snapshots inmutables por ejecución (ARCHITECTURE.md §27).
-- ---------------------------------------------------------------------
create table public.report_runs (
  id            uuid primary key default gen_random_uuid(),
  province_id   uuid not null references public.provinces (id) on delete restrict,
  period_start  date not null check (extract(isodow from period_start) = 1),
  period_end    date not null,
  version       integer not null check (version > 0),
  status        text not null default 'running' check (status in ('running', 'succeeded', 'failed')),
  trigger       text not null check (trigger in ('cron', 'manual')),
  attempts      smallint not null default 1,
  requested_by  uuid references public.profiles (id) on delete set null,
  storage_path  text check (storage_path ~ '^[a-z0-9/_.-]+\.pdf$'),
  error         text check (char_length(error) <= 2000),
  started_at    timestamptz not null default now(),
  finished_at   timestamptz,
  unique (province_id, period_start, version),
  check (period_end = period_start + 6),
  check (status <> 'succeeded' or storage_path is not null)
);

create table public.weekly_kpi_snapshots (
  id               bigint generated always as identity primary key,
  report_run_id    uuid not null references public.report_runs (id) on delete cascade,
  period_start     date not null,
  municipality_id  uuid references public.municipalities (id) on delete restrict,  -- NULL = provincia
  metrics          jsonb not null check (jsonb_typeof(metrics) = 'object'),
  created_at       timestamptz not null default now(),
  unique nulls not distinct (report_run_id, municipality_id)
);
