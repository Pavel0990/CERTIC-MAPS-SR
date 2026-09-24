-- =====================================================================
-- SR Conecta · 220 · Índices de soporte para claves foráneas
-- Referencia: DATABASE.md §5.9
--
-- Regla: toda FK hacia profiles lleva índice. Al borrar una cuenta, cada ON DELETE SET NULL / CASCADE
-- busca las filas que la referencian; sin índice sería un recorrido completo de cada tabla.
-- Parciales (WHERE ... IS NOT NULL): la mayoría de filas no tiene valor y el índice queda pequeño.
-- Las FK hacia catálogos y territorio (ON DELETE RESTRICT, casi nunca se borran) no se indexan a propósito.
-- =====================================================================
set search_path = public, extensions;

create index if not exists user_roles_granted_by_idx          on public.user_roles (granted_by) where granted_by is not null;
create index if not exists profiles_home_municipality_idx     on public.profiles (home_municipality_id) where home_municipality_id is not null;
create index if not exists businesses_created_by_idx          on public.businesses (created_by) where created_by is not null;
create index if not exists promotions_created_by_idx          on public.promotions (created_by) where created_by is not null;
create index if not exists tourism_places_proposed_by_idx     on public.tourism_places (proposed_by) where proposed_by is not null;
create index if not exists tourism_places_reviewed_by_idx     on public.tourism_places (reviewed_by) where reviewed_by is not null;
create index if not exists eco_routes_proposed_by_idx         on public.eco_routes (proposed_by) where proposed_by is not null;
create index if not exists eco_routes_reviewed_by_idx         on public.eco_routes (reviewed_by) where reviewed_by is not null;
create index if not exists citizen_requests_assigned_idx      on public.citizen_requests (assigned_to) where assigned_to is not null;
create index if not exists request_history_changed_by_idx     on public.request_status_history (changed_by) where changed_by is not null;
create index if not exists traffic_reports_escalated_idx      on public.traffic_reports (escalated_request_id) where escalated_request_id is not null;
create index if not exists attachments_owner_idx              on public.attachments (owner_id) where owner_id is not null;
create index if not exists moderation_actions_moderator_idx   on public.moderation_actions (moderator_id) where moderator_id is not null;
create index if not exists report_runs_requested_by_idx       on public.report_runs (requested_by) where requested_by is not null;
