-- =====================================================================
-- Script de operación (ADR-020): crear un administrador PROVINCIAL.
-- En la aplicación no existe ninguna vía para otorgar alcance provincial: se hace con este script,
-- revisado en un PR, ejecutado primero en staging y luego en producción.
--
-- Uso, con la cadena de conexión del proyecto (pooler, modo sesión):
--   psql "$SUPABASE_DB_URL" -v email='persona@municipio.gob.do' -f supabase/ops/grant_provincial_admin.sql
-- La persona debe haberse registrado antes en la app (tiene que existir en auth.users).
-- =====================================================================
\set ON_ERROR_STOP on
begin;

-- Aborta (división por cero) si el correo no corresponde a exactamente un usuario registrado
select 1 / (select case when count(*) = 1 then 1 else 0 end
            from auth.users where lower(email) = lower(:'email')) as usuario_encontrado;

with u as (
  select au.id from auth.users au where lower(au.email) = lower(:'email')
), ins as (
  insert into public.user_roles (user_id, role, province_id, municipality_id)
  select u.id, 'municipal_admin', private.default_province_id(), null from u
  on conflict on constraint user_roles_scope_unique do nothing
  returning user_id
)
insert into public.audit_logs (province_id, actor_id, actor_role, action, entity_type, entity_id, after)
select private.default_province_id(), null, 'operation_script', 'role.grant', 'user_role', ins.user_id,
       jsonb_build_object('role', 'municipal_admin', 'scope', 'province', 'script', 'grant_provincial_admin.sql')
from ins;

select count(*) as administradores_provinciales
from public.user_roles where role = 'municipal_admin' and municipality_id is null;

commit;
