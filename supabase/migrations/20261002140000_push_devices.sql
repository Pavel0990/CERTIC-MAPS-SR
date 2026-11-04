-- =====================================================================
-- SR Conecta · 280 · Dispositivos de Web Push: alta y baja desde el perfil
-- Referencia: ARCHITECTURE.md §9.5 · ADR-013
-- Un navegador tiene UNA suscripción (endpoint). Si otra persona entra en ese mismo navegador,
-- el dispositivo pasa a la cuenta nueva: los avisos privados de la anterior dejan de llegar ahí.
-- Con RLS sola no se puede (nadie ve ni borra filas ajenas), por eso es una función.
-- =====================================================================
set search_path = public, extensions;

insert into private.rate_limit_rules (action, max_count, window_size) values
  ('push_device', 20, interval '1 hour')
on conflict (action) do nothing;

create or replace function public.register_push_device(p_endpoint text, p_p256dh text, p_auth text, p_user_agent text default null)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then return private.reject('not_authenticated'); end if;
  if not private.hit_rate_limit('push_device') then return private.reject('rate_limited'); end if;
  if p_endpoint is null or p_endpoint !~ '^https://' or char_length(p_endpoint) > 1000
     or coalesce(char_length(p_p256dh), 0) not between 1 and 200 or coalesce(char_length(p_auth), 0) not between 1 and 100 then
    return private.reject('invalid_subscription');
  end if;

  delete from public.push_subscriptions where endpoint = p_endpoint and user_id <> v_uid;
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
  values (v_uid, p_endpoint, p_p256dh, p_auth, left(p_user_agent, 400))
  on conflict (endpoint) do update set p256dh = excluded.p256dh, auth = excluded.auth, user_agent = excluded.user_agent;

  insert into public.notification_preferences (user_id, push_enabled) values (v_uid, true)
  on conflict (user_id) do update set push_enabled = true;
  return jsonb_build_object('status', 'ok');
end $$;

-- Baja de este dispositivo. Si era el último, se apaga el push de la cuenta (no se encolan envíos inútiles).
create or replace function public.unregister_push_device(p_endpoint text)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then return private.reject('not_authenticated'); end if;
  delete from public.push_subscriptions where endpoint = p_endpoint and user_id = v_uid;
  if not exists (select 1 from public.push_subscriptions where user_id = v_uid) then
    update public.notification_preferences set push_enabled = false where user_id = v_uid;
  end if;
  return jsonb_build_object('status', 'ok');
end $$;

revoke all on function public.register_push_device(text, text, text, text) from public, anon;
revoke all on function public.unregister_push_device(text) from public, anon;
grant execute on function public.register_push_device(text, text, text, text), public.unregister_push_device(text) to authenticated;
