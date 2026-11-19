-- Quita las 10 alertas de tránsito de prueba (texto sin sentido o "Para prueba nomás!", del 26/09 al 05/11),
-- que no se ven en el mapa pero cuentan en el panel y en el informe semanal. Revisadas una por una el 18/11.
-- Borra por id exacto y solo si siguen vencidas, rechazadas o resueltas: una alerta activa nunca se toca.
-- Sus fotos (attachments) se borran solas (on delete cascade). La auditoría y el historial de moderación
-- se conservan a propósito: son el registro de lo que pasó. Los informes semanales ya generados no cambian.
-- Antes: npm run backup. Aplicar: npx supabase db query --remote -f supabase/ops/remove_test_traffic_reports.sql
begin;

create temp table prueba (id uuid primary key) on commit drop;
insert into prueba
select id from public.traffic_reports
where status in ('expired', 'rejected', 'resolved')
  and id in (
    'a993ba08-5ccd-40e8-a675-477b3f874fcf', 'dc898b9f-6a97-44e2-a525-49c0cbeaff5a',
    'a0006f0c-61aa-4f1c-b1cd-a9b3bc914e2e', 'e5151f48-a0a5-4086-9fb3-cfa2738c695b',
    '04bfe543-d9fc-42c5-b7bd-eef992e67fc7', '7b6b733f-93af-4447-8737-1d9299079a11',
    '0274240d-6bca-4f22-8b36-e9ea8e80436f', '6244a47e-bf31-44fb-9042-f58a5fcf61cc',
    '95b89407-b84f-438c-9a88-2e8e370543e3', 'ce4787e6-20ae-4cf2-b106-c22734432d43'
  );

-- Avisos que llevan a esas alertas (al personal y a los vecinos cercanos): sin la alerta, quedarían rotos
delete from public.notifications n
using prueba p
where (n.kind = 'traffic_status' and n.payload ->> 'entity' = 'traffic_report' and (n.payload ->> 'id')::uuid = p.id)
   or (n.kind = 'traffic_nearby' and (n.payload ->> 'traffic_report_id')::uuid = p.id);

delete from public.traffic_reports t using prueba p where t.id = p.id;

select (select count(*) from prueba) as alertas_borradas,
       (select count(*) from public.traffic_reports) as alertas_que_quedan;

commit;
