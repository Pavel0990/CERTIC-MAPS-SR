-- =====================================================================
-- SR Conecta · 250 · Responsables de las consultas y directorio del personal
-- Referencia: ARCHITECTURE.md §9.2, §9.7 · DATABASE.md §5.13
-- Hallazgo al construir el panel (27/09/2026): la columna assigned_to está oculta por grant de columna
-- a todo `authenticated` (incluido el personal), así que la bandeja no podía mostrar quién atiende cada
-- consulta ni a quién asignarla. Estas dos funciones lo exponen SOLO al personal del municipio.
-- =====================================================================
set search_path = public, extensions;

-- Responsable actual de cada consulta (solo las del alcance de quien llama)
create or replace function public.request_assignees(p_ids uuid[])
returns table (request_id uuid, assignee_id uuid, assignee_name text)
language sql stable security definer
set search_path = ''
as $$
  select r.id, r.assigned_to, p.display_name
  from public.citizen_requests r
  left join public.profiles p on p.id = r.assigned_to
  where r.id = any (p_ids)
    and r.assigned_to is not null
    and private.is_staff(r.municipality_id)
  limit 500
$$;

-- Personal (moderadores y administradores) con alcance sobre un municipio: a quién se puede asignar
create or replace function public.staff_directory(p_municipality_id uuid)
returns table (user_id uuid, display_name text, role text, provincial boolean)
language sql stable security definer
set search_path = ''
as $$
  select distinct on (ur.user_id) ur.user_id, p.display_name, ur.role, ur.municipality_id is null
  from public.user_roles ur
  join public.profiles p on p.id = ur.user_id
  join public.municipalities m on m.id = p_municipality_id
  where private.is_staff(p_municipality_id)
    and ur.role in ('moderator', 'municipal_admin')
    and ur.province_id = m.province_id
    and (ur.municipality_id = p_municipality_id or ur.municipality_id is null)
  order by ur.user_id, (ur.role = 'municipal_admin') desc
$$;

revoke all on function public.request_assignees(uuid[]) from public, anon;
grant execute on function public.request_assignees(uuid[]) to authenticated;
revoke all on function public.staff_directory(uuid) from public, anon;
grant execute on function public.staff_directory(uuid) to authenticated;
