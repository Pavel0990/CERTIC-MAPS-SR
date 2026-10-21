-- =====================================================================
-- SR Conecta · Reinicio de los límites por hora de las cuentas de prueba (E2E repetibles, ADR-025).
--
-- Los límites por acción se cuentan en private.rate_limit_hits (ventana fija, 070). Cada corrida de
-- Playwright crea una alerta y cambia la foto de perfil de la cuenta de prueba: después de unas pocas
-- corridas en la misma hora, la cuenta queda en 'rate_limited' y las pruebas fallan sin motivo real.
-- El esquema private no se expone en la API, así que tests/e2e/helpers.ts necesita esta RPC.
--
-- Barreras (la clave de servicio ya puede todo, pero esto no debe servir para nada más):
--  · solo service_role la ejecuta (nunca anon ni authenticated; lo revisa security_audit.sql);
--  · solo borra los contadores de cuentas con correo @example.com, dominio reservado (RFC 2606)
--    que ninguna persona real puede tener: las de scripts/staging-test-users.mjs;
--  · no toca las reglas (rate_limit_rules) ni a ninguna otra cuenta.
-- =====================================================================

create or replace function public.e2e_reset_rate_limits(p_emails text[])
returns integer
language plpgsql security definer
set search_path = ''
as $$
declare
  n integer;
begin
  delete from private.rate_limit_hits h
  using auth.users u
  where h.user_id = u.id
    and u.email = any (p_emails)
    and u.email like '%@example.com';
  get diagnostics n = row_count;
  return n;
end $$;

revoke all on function public.e2e_reset_rate_limits(text[]) from public, anon, authenticated;
grant execute on function public.e2e_reset_rate_limits(text[]) to service_role;
