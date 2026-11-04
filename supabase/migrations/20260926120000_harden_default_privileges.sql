-- =====================================================================
-- SR Conecta · 240 · Privilegios por defecto de Supabase
-- Referencia: ARCHITECTURE.md §10.3 · DATABASE.md §5.12
-- Hallazgo en el proyecto real (26/09/2026, `supabase db advisors`): Supabase concede por defecto
-- EXECUTE a anon y authenticated sobre toda función nueva de public, y USAGE/SELECT/UPDATE sobre
-- toda secuencia. La migración 230 solo revocaba a PUBLIC, así que anon podía llamar
-- authorize_report_download (la función lo rechazaba, pero rompía el mínimo privilegio).
-- =====================================================================

-- 1. Corregir la función expuesta
revoke execute on function public.authorize_report_download(uuid) from anon;

-- 2. Que las funciones y secuencias futuras nazcan cerradas: cada una recibe su grant explícito
alter default privileges for role postgres in schema public revoke execute on functions from anon, authenticated;
alter default privileges for role postgres in schema public revoke usage, select, update on sequences from anon, authenticated;

-- 3. Secuencias existentes: nadie las usa directamente (las identidades las llenan funciones del propietario)
revoke usage, select, update on all sequences in schema public from anon, authenticated;
