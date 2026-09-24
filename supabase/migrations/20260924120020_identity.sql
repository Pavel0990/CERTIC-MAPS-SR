-- =====================================================================
-- SR Conecta · 020 · Identidad: perfiles, roles con alcance territorial, helpers de permisos
-- Referencia: DATABASE.md §5.2, §8 · ARCHITECTURE.md §16, ADR-020 (sin super_admin)
-- =====================================================================
set search_path = public, extensions;

create table public.profiles (
  id                    uuid primary key references auth.users (id) on delete cascade,
  display_name          text not null check (char_length(display_name) between 1 and 80),
  home_municipality_id  uuid references public.municipalities (id) on delete set null,
  location_consent      boolean not null default false,
  locale                text not null default 'es' check (locale in ('es', 'en')),
  -- Reputación simple: sube con reportes verificados, baja con rechazados (ARCHITECTURE.md §17)
  reputation            smallint not null default 0 check (reputation between -100 and 100),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function private.set_updated_at();

create table public.user_roles (
  id               bigint generated always as identity primary key,
  user_id          uuid not null references public.profiles (id) on delete cascade,
  role             text not null check (role in ('citizen', 'entrepreneur', 'moderator', 'municipal_admin')),
  province_id      uuid not null references public.provinces (id) on delete restrict,
  municipality_id  uuid,   -- NULL = alcance provincial
  granted_by       uuid references public.profiles (id) on delete set null,
  created_at       timestamptz not null default now(),
  foreign key (municipality_id, province_id) references public.municipalities (id, province_id) on delete cascade,
  -- NULL significa "toda la provincia": sin NULLS NOT DISTINCT dos filas provinciales iguales no chocarían
  constraint user_roles_scope_unique unique nulls not distinct (user_id, role, province_id, municipality_id)
);
create index user_roles_user_idx on public.user_roles (user_id);

-- ---------------------------------------------------------------------
-- Helpers de permisos. SECURITY DEFINER para poder leer user_roles desde políticas RLS
-- sin conceder SELECT sobre la tabla. `(select auth.uid())` se evalúa una vez por consulta.
-- ---------------------------------------------------------------------

-- ¿p_user tiene alguno de p_roles con alcance sobre p_municipality_id?
-- p_municipality_id NULL ⇒ solo cuenta el alcance provincial.
create or replace function private.user_has_role(p_user uuid, p_roles text[], p_municipality_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles r
    where r.user_id = p_user
      and r.role = any (p_roles)
      and (
        r.municipality_id = p_municipality_id
        or (r.municipality_id is null
            and (p_municipality_id is null
                 or exists (select 1 from public.municipalities m
                            where m.id = p_municipality_id and m.province_id = r.province_id)))
      )
  )
$$;

create or replace function private.is_staff(p_municipality_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$ select private.user_has_role((select auth.uid()), array['moderator', 'municipal_admin'], p_municipality_id) $$;

create or replace function private.is_admin(p_municipality_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$ select private.user_has_role((select auth.uid()), array['municipal_admin'], p_municipality_id) $$;

create or replace function private.is_provincial_admin()
returns boolean language sql stable security definer set search_path = ''
as $$ select private.user_has_role((select auth.uid()), array['municipal_admin'], null) $$;

-- ¿Tiene algún rol de personal, en cualquier alcance? (acceso al panel)
create or replace function private.is_any_staff()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.user_roles r
                 where r.user_id = (select auth.uid()) and r.role in ('moderator', 'municipal_admin'))
$$;

-- Rol más alto del usuario actual (para auditoría)
create or replace function private.current_role_label()
returns text language sql stable security definer set search_path = ''
as $$
  select coalesce((
    select r.role from public.user_roles r
    where r.user_id = (select auth.uid())
    order by array_position(array['municipal_admin', 'moderator', 'entrepreneur', 'citizen'], r.role)
    limit 1), case when private.is_service() then 'service' else 'anonymous' end)
$$;

-- ---------------------------------------------------------------------
-- Alta automática: al registrarse en Supabase Auth se crea el perfil y el rol citizen.
-- Si falla, el registro falla (no hay usuarios sin perfil).
-- ---------------------------------------------------------------------
create or replace function private.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_province uuid := private.default_province_id();
begin
  if v_province is null then
    raise exception 'No hay provincias cargadas: ejecutar el seed territorial antes de abrir el registro';
  end if;
  insert into public.profiles (id, display_name)
  values (new.id, left(coalesce(nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
                                nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
                                'Vecino'), 80));
  insert into public.user_roles (user_id, role, province_id) values (new.id, 'citizen', v_province);
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();
