-- Quita de las 3 rutas de OSM la nota interna "conviene validarlo con el municipio antes de recomendarlo",
-- que se veía en público, y pone en su lugar un consejo para quien la recorre. Idempotente.
-- Antes: npm run backup. Aplicar: npx supabase db query --linked -f supabase/ops/fix_route_validation_note.sql
update public.eco_routes
set description = replace(description,
  'El trazado sigue calles y caminos que existen en OpenStreetMap; conviene validarlo con el municipio antes de recomendarlo.',
  'El trazado sigue calles y caminos que existen en OpenStreetMap. Antes de salir, pregunta en el pueblo cómo está el camino.')
where description like '%conviene validarlo con el municipio antes de recomendarlo.%';

select slug, right(description, 90) as final from public.eco_routes where slug like '%-osm' order by slug;
