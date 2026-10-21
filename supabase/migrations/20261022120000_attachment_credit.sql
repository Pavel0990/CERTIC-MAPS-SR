-- =====================================================================
-- SR Conecta · Crédito de las fotos con licencia libre (PROPUESTA: todavía no aplicada en staging)
--
-- Las fotos de Wikimedia Commons (CC BY, CC BY-SA) exigen mostrar autor y licencia junto a la foto.
-- Hoy el crédito va al final de la descripción (scripts/load-places-content.mjs). Con esta columna el
-- crédito queda pegado a la foto: la galería lo puede mostrar debajo de cada imagen, y si alguien
-- reescribe la descripción no se pierde.
--
-- · NULL = foto propia (subida desde la app): no necesita crédito.
-- · Solo la escribe la carga con la clave de servicio; la API no concede UPDATE a nadie.
-- · Se lee igual que las demás columnas públicas del adjunto (la política attachments_read no cambia).
--
-- Compatible con el código actual (solo agrega una columna anulable). Aplicar con el flujo de siempre:
-- npm run backup → npx supabase db push --dry-run → npx supabase db push.
-- =====================================================================

alter table public.attachments
  add column credit text check (char_length(credit) between 1 and 300);

comment on column public.attachments.credit is
  'Autor, licencia y fuente de una foto con licencia libre (p. ej. «Foto: Autora, CC BY-SA 4.0, Wikimedia Commons»). NULL en fotos propias.';

grant select (credit) on public.attachments to anon, authenticated;
