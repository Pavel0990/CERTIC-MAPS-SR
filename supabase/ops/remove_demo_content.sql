-- Quita el contenido de demostración cargado por seed_demo_content.sql (no toca datos reales).
delete from public.citizen_requests where description like '%(demostración)%';
delete from public.traffic_reports where description like '%(demostración)%';
delete from public.businesses where slug like '%-demo';
delete from public.eco_routes where description like '%de demostración%';
delete from public.tourism_places where description like '%Texto de demostración%';
