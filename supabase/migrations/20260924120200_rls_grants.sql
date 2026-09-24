-- =====================================================================
-- SR Conecta · 200 · RLS, grants por columna y permisos de ejecución
-- Referencia: DATABASE.md §7 (matriz RLS) · ARCHITECTURE.md §17, ADR-018
--
-- Modelo:
--  · RLS activado en TODAS las tablas de public (sin política = sin acceso)
--  · Escrituras de negocio SOLO por RPC (SECURITY DEFINER): los usuarios no tienen INSERT/UPDATE/DELETE
--    sobre tablas críticas. Excepciones acotadas: perfil propio, preferencias, suscripciones push,
--    marcar notificaciones como leídas.
--  · RLS protege filas; los GRANT por columna protegen columnas personales (autor, asignado, claves).
--  · (select auth.uid()) se evalúa una vez por consulta (initPlan), no por fila.
-- =====================================================================
set search_path = public, extensions;

-- Punto de partida determinista: nada concedido a anon/authenticated (Supabase concede por defecto)
revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;
revoke all on all tables    in schema private from public, anon, authenticated;
revoke all on all functions in schema private from public, anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;

-- Helpers que evalúan las políticas: ejecutables por los roles de la API (esquema no expuesto)
grant execute on function
  private.is_staff(uuid), private.is_admin(uuid), private.is_provincial_admin(), private.is_any_staff(),
  private.is_business_member(uuid, boolean), private.f_unaccent(text), private.is_service(),
  private.reject(text, jsonb)   -- usada por las RPC SECURITY INVOKER (map_features)
to anon, authenticated, service_role;
grant execute on function private.upload_quota_ok() to authenticated;   -- política de Storage

-- ---------------------------------------------------------------------
-- RLS en todas las tablas de public
-- ---------------------------------------------------------------------
alter table public.provinces               enable row level security;
alter table public.municipalities          enable row level security;
alter table public.feature_flags           enable row level security;
alter table public.profiles                enable row level security;
alter table public.user_roles              enable row level security;
alter table public.business_categories     enable row level security;
alter table public.traffic_report_types    enable row level security;
alter table public.request_categories      enable row level security;
alter table public.businesses              enable row level security;
alter table public.business_members        enable row level security;
alter table public.business_hours          enable row level security;
alter table public.promotions              enable row level security;
alter table public.tourism_places          enable row level security;
alter table public.eco_routes              enable row level security;
alter table public.engagement_daily        enable row level security;
alter table public.citizen_requests        enable row level security;
alter table public.request_status_history  enable row level security;
alter table public.request_votes           enable row level security;
alter table public.traffic_reports         enable row level security;
alter table public.attachments             enable row level security;
alter table public.moderation_actions      enable row level security;
alter table public.audit_logs              enable row level security;
alter table public.notifications           enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.push_subscriptions      enable row level security;
alter table public.report_runs             enable row level security;
alter table public.weekly_kpi_snapshots    enable row level security;

-- ---------------------------------------------------------------------
-- Territorio y catálogos: lectura pública
-- ---------------------------------------------------------------------
grant select on public.provinces, public.business_categories, public.traffic_report_types, public.request_categories
  to anon, authenticated;
grant select (id, province_id, code, name, geom_simplified, created_at) on public.municipalities to anon, authenticated;
grant select (id, key, province_id, municipality_id, enabled, config) on public.feature_flags to anon, authenticated;

create policy provinces_read      on public.provinces            for select to anon, authenticated using (true);
create policy municipalities_read on public.municipalities       for select to anon, authenticated using (true);
create policy feature_flags_read  on public.feature_flags        for select to anon, authenticated using (true);
create policy categories_read     on public.business_categories  for select to anon, authenticated using (active);
create policy traffic_types_read  on public.traffic_report_types for select to anon, authenticated using (active);
create policy request_cats_read   on public.request_categories   for select to anon, authenticated using (active);

-- ---------------------------------------------------------------------
-- Perfiles y roles
-- ---------------------------------------------------------------------
grant select (id, display_name, home_municipality_id, location_consent, locale, reputation, created_at, updated_at)
  on public.profiles to authenticated;
-- el usuario solo edita estas columnas (no reputación, no id)
grant update (display_name, home_municipality_id, location_consent, locale) on public.profiles to authenticated;
create policy profiles_read_own_or_staff on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select private.is_any_staff()));
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

grant select (id, user_id, role, province_id, municipality_id, created_at) on public.user_roles to authenticated;
create policy user_roles_read on public.user_roles for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_provincial_admin()) or private.is_admin(municipality_id));

-- ---------------------------------------------------------------------
-- Negocios, promociones, lugares y rutas: público lo aprobado/publicado; autor y personal ven lo demás
-- Columnas personales (created_by, proposed_by, reviewed_by, idempotency_key) fuera del GRANT.
-- ---------------------------------------------------------------------
grant select (id, province_id, municipality_id, category_id, slug, name, description, translations, geom, address,
              phone, whatsapp, email, website, google_place_id, status, status_reason, version, search_vector,
              created_at, updated_at, deleted_at)
  on public.businesses to anon, authenticated;
create policy businesses_read on public.businesses for select to anon, authenticated
  using ((status = 'approved' and deleted_at is null)
         or private.is_business_member(id)
         or private.is_staff(municipality_id));

grant select on public.business_members to authenticated;
create policy business_members_read on public.business_members for select to authenticated
  using (user_id = (select auth.uid()) or private.is_business_member(business_id)
         or exists (select 1 from public.businesses b where b.id = business_id and private.is_staff(b.municipality_id)));

-- La visibilidad de horarios y promociones hereda la del negocio (la subconsulta pasa por la RLS de businesses)
grant select on public.business_hours to anon, authenticated;
create policy business_hours_read on public.business_hours for select to anon, authenticated
  using (exists (select 1 from public.businesses b where b.id = business_id));

grant select (id, business_id, title, description, valid_from, valid_until, status, created_at) on public.promotions to anon, authenticated;
create policy promotions_read on public.promotions for select to anon, authenticated
  using ((status = 'active' and current_date between valid_from and valid_until
          and exists (select 1 from public.businesses b where b.id = business_id and b.status = 'approved'))
         or private.is_business_member(business_id)
         or exists (select 1 from public.businesses b where b.id = business_id and private.is_staff(b.municipality_id)));

grant select (id, province_id, municipality_id, slug, name, kind, description, translations, services, accessibility,
              opening_info, geom, status, status_reason, version, search_vector, created_at, updated_at, deleted_at)
  on public.tourism_places to anon, authenticated;
create policy tourism_places_read on public.tourism_places for select to anon, authenticated
  using ((status = 'published' and deleted_at is null)
         or proposed_by = (select auth.uid())
         or private.is_staff(municipality_id));

grant select (id, province_id, municipality_id, municipality_ids, slug, name, kind, difficulty, duration_min, description,
              services, translations, geom, geom_simplified, start_point, distance_km, status, status_reason, version,
              search_vector, created_at, updated_at, deleted_at)
  on public.eco_routes to anon, authenticated;
create policy eco_routes_read on public.eco_routes for select to anon, authenticated
  using ((status = 'published' and deleted_at is null)
         or proposed_by = (select auth.uid())
         or private.is_staff(municipality_id));

grant select on public.engagement_daily to authenticated;
create policy engagement_read on public.engagement_daily for select to authenticated
  using ((entity_type = 'business' and private.is_business_member(entity_id)) or (select private.is_any_staff()));

-- ---------------------------------------------------------------------
-- Participación ciudadana
-- Autor (requester_id / reporter_id), asignado y claves de idempotencia NO son columnas visibles:
-- el autor ve lo suyo con public.my_activity(); el personal, con las RPC del panel.
-- ---------------------------------------------------------------------
grant select (id, province_id, municipality_id, kind, category, title, description, geom, status, is_public,
              support_count, resolution_note, rejection_reason, created_at, updated_at)
  on public.citizen_requests to anon, authenticated;
create policy citizen_requests_read on public.citizen_requests for select to anon, authenticated
  using ((is_public and status in ('approved', 'in_progress', 'resolved'))
         or requester_id = (select auth.uid())
         or private.is_staff(municipality_id));

-- Las subconsultas dentro de una política RESPETAN los grants por columna: como requester_id no es visible,
-- la comprobación va en un helper SECURITY DEFINER (si no, "permission denied for table citizen_requests").
create or replace function private.can_read_request(p_request_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.citizen_requests r
                 where r.id = p_request_id
                   and (r.requester_id = (select auth.uid()) or private.is_staff(r.municipality_id)))
$$;
revoke all on function private.can_read_request(uuid) from public;
grant execute on function private.can_read_request(uuid) to authenticated;

grant select (id, request_id, from_status, to_status, note, created_at) on public.request_status_history to authenticated;
create policy request_history_read on public.request_status_history for select to authenticated
  using (private.can_read_request(request_id));

grant select on public.request_votes to authenticated;
create policy request_votes_read_own on public.request_votes for select to authenticated
  using (user_id = (select auth.uid()));

grant select (id, province_id, municipality_id, type, severity, description, geom, status, expires_at, created_at, updated_at)
  on public.traffic_reports to anon, authenticated;
create policy traffic_reports_read on public.traffic_reports for select to anon, authenticated
  using ((status in ('active', 'verified') and expires_at > now())
         or reporter_id = (select auth.uid())
         or private.is_staff(municipality_id));

-- ---------------------------------------------------------------------
-- Adjuntos, moderación y auditoría
-- ---------------------------------------------------------------------
grant select (id, business_id, tourism_place_id, eco_route_id, traffic_report_id, citizen_request_id, bucket, path, mime,
              width, height, status, created_at)
  on public.attachments to anon, authenticated;
create policy attachments_read on public.attachments for select to anon, authenticated
  using ((bucket = 'public-media' and status = 'approved')
         or owner_id = (select auth.uid())
         or (select private.is_any_staff()));

grant select on public.moderation_actions to authenticated;
create policy moderation_read on public.moderation_actions for select to authenticated
  using ((select private.is_any_staff()));

grant select on public.audit_logs to authenticated;
create policy audit_read on public.audit_logs for select to authenticated
  using ((select private.is_provincial_admin()) or (municipality_id is not null and private.is_admin(municipality_id)));

-- ---------------------------------------------------------------------
-- Notificaciones, preferencias y suscripciones: solo lo propio
-- ---------------------------------------------------------------------
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;
create policy notifications_read_own on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));
create policy notifications_mark_read on public.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

grant select, insert, update, delete on public.notification_preferences to authenticated;
create policy notification_prefs_own on public.notification_preferences for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

grant select (id, endpoint, user_agent, last_success_at, created_at), insert (user_id, endpoint, p256dh, auth, user_agent), delete
  on public.push_subscriptions to authenticated;
create policy push_subs_read_own   on public.push_subscriptions for select to authenticated using (user_id = (select auth.uid()));
create policy push_subs_insert_own on public.push_subscriptions for insert to authenticated with check (user_id = (select auth.uid()));
create policy push_subs_delete_own on public.push_subscriptions for delete to authenticated using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------
-- Informes: administradores
-- ---------------------------------------------------------------------
grant select on public.report_runs, public.weekly_kpi_snapshots to authenticated;
create policy report_runs_read on public.report_runs for select to authenticated
  using ((select private.is_provincial_admin())
         or exists (select 1 from public.user_roles r where r.user_id = (select auth.uid()) and r.role = 'municipal_admin'));
create policy kpi_snapshots_read on public.weekly_kpi_snapshots for select to authenticated
  using ((select private.is_provincial_admin())
         or (municipality_id is null and exists (select 1 from public.user_roles r where r.user_id = (select auth.uid()) and r.role = 'municipal_admin'))
         or (municipality_id is not null and private.is_admin(municipality_id)));

-- ---------------------------------------------------------------------
-- RPC: permisos de ejecución explícitos (todo lo demás queda sin EXECUTE para anon/authenticated)
-- ---------------------------------------------------------------------
grant execute on function
  public.map_features(double precision, double precision, double precision, double precision, text[], integer),
  public.map_aggregates(),
  public.search_all(text, integer),
  public.track_engagement(text, uuid, text)
to anon, authenticated;

grant execute on function
  public.create_traffic_report(text, double precision, double precision, text, smallint, text),
  public.moderate_traffic_report(uuid, text, text, text),
  public.escalate_traffic_report(uuid, text),
  public.create_citizen_request(text, text, text, text, text, double precision, double precision, uuid),
  public.change_request_status(uuid, text, text, text),
  public.assign_request(uuid, uuid),
  public.toggle_request_vote(uuid),
  public.set_request_public(uuid, boolean),
  public.submit_business(text, text, double precision, double precision, text, text, text, text, text, text, text),
  public.update_business(uuid, integer, jsonb),
  public.set_business_hours(uuid, jsonb),
  public.create_promotion(uuid, text, date, date, text),
  public.propose_place(text, text, double precision, double precision, text),
  public.propose_route(text, text, text, integer, jsonb, text),
  public.review_content(text, uuid, text, text, text),
  public.assign_role(uuid, text, uuid),
  public.revoke_role(uuid, text, uuid),
  public.register_attachment(text, uuid, text),
  public.update_place(uuid, integer, jsonb),
  public.update_route(uuid, integer, jsonb),
  public.my_activity(),
  public.kpi_summary(date, date, uuid),
  public.weekly_report_begin(date, boolean)
to authenticated;

grant execute on function
  public.worker_claim_jobs(integer, integer),
  public.worker_finish_job(bigint, boolean, text),
  public.worker_attachment_processed(uuid, boolean, text, integer, integer, integer, text),
  public.worker_attachment_published(uuid),
  public.worker_run_fanout_alert(uuid),
  public.worker_queue_health(),
  public.weekly_report_begin(date, boolean),
  public.weekly_report_finish(uuid, boolean, text, text),
  public.kpi_summary(date, date, uuid)
to service_role;
