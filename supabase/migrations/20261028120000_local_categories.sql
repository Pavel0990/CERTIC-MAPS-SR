-- Categorías de la realidad de Santiago Rodríguez (rúbrica: pertinencia territorial).
-- Aditiva (ADR-017): solo agrega filas. `on conflict do nothing`: si la administración provincial ya
-- creó alguna desde Panel → Catálogos, se respeta la suya. Se pueden renombrar o desactivar desde el panel.

-- Negocios: la economía local va más allá del colmado. Monción es tierra de casabe; en las lomas hay
-- café, queso y frutas de finca; y en el campo las agropecuarias abastecen a productores y ganaderos.
insert into public.business_categories (slug, name, icon, sort) values
  ('casabe',       'Casabe y productos locales',         'store',   55),
  ('finca',        'Productos de finca (café, queso, frutas)', 'leaf', 56),
  ('agropecuaria', 'Agropecuaria y ferretería',          'tractor', 75)
on conflict (slug) do nothing;

-- Tránsito: en las carreteras de la provincia es común el ganado suelto, sobre todo de noche.
insert into public.traffic_report_types (code, name, icon, default_severity, default_ttl, sort) values
  ('animales', 'Animales en la vía', 'dog', 2, interval '3 hours', 65)
on conflict (code) do nothing;

-- Reportes al municipio: buena parte de la provincia vive en comunidades rurales de montaña, donde un
-- camino vecinal o un puente dañado deja a la gente incomunicada.
insert into public.request_categories (code, kind, name, icon, sort) values
  ('camino_vecinal', 'incident', 'Camino vecinal o puente', 'detour', 35)
on conflict (code) do nothing;
