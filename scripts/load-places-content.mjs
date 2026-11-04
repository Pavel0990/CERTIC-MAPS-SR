// Carga repetible del contenido de lugares turísticos y rutas: data/lugares-contenido.json → base vinculada.
//
//   node scripts/load-places-content.mjs --dry-run   muestra qué crearía o completaría, sin escribir nada
//   node scripts/load-places-content.mjs             escribe (antes: npm run backup)
//
// Reglas (data/README.md):
//  · Idempotente: identifica cada lugar por su slug (lleva el id de OSM o de Wikidata) o por nombre + municipio,
//    y cada foto por un id derivado del nombre del archivo en Commons. Correrlo dos veces no duplica nada.
//  · Solo agrega o completa. Nunca borra. Un campo con texto distinto al que puso la carga de OSM
//    se considera escrito por el municipio: no se toca y se anota en la salida.
//  · El contenido queda publicado (como supabase/ops/load_osm_content.sql) y las fotos aprobadas en public-media,
//    procesadas como las del worker: WebP, sin metadatos, máximo 1600 px por lado (igual que las que suben los teléfonos).
//  · El crédito de cada foto va al final de la descripción (lo exigen CC BY y CC BY-SA). Sin descripción
//    propia no se agrega la foto, para no publicarla sin crédito.
//
// Lee la base con la CLI de Supabase (proyecto vinculado, como scripts/backup-snapshot.mjs) y sube las fotos
// con la clave de servicio de .env.local. Nunca imprime secretos.
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';

const DRY = process.argv.includes('--dry-run');
const FILE = 'data/lugares-contenido.json';
const BUCKET = 'public-media';
const MAX_SIDE = 1600; // como compressImage() en el teléfono
const QUALITY = 80; // como IMAGE_LIMITS.quality del worker
const MAX_PHOTOS = 10; // límite de register_attachment para lugares y rutas
const MAX_BYTES = 5 * 1024 * 1024; // límite del bucket
const UA = 'SR-Conecta/1.0 (carga de contenido; https://github.com/Pavel0990)';

const data = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const PROVINCE = data._info.province_code;

// ---------------------------------------------------------------- utilidades
const lit = (v) => (v === null || v === undefined ? 'null' : `'${String(v).replace(/'/g, "''")}'`);
const norm = (s) => (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const empty = (s) => s === null || s === undefined || String(s).trim() === '';

/** UUID estable a partir del archivo de Commons: la misma foto siempre tiene el mismo id y la misma ruta. */
function photoId(file) {
  const h = crypto.createHash('sha1').update(`sr-conecta:commons:${file}`).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-${((parseInt(h[16], 16) & 0x3) | 0x8).toString(16)}${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

/** Ejecuta SQL en la base vinculada; devuelve las filas de la última sentencia. */
function sql(text) {
  const tmp = path.join(os.tmpdir(), `sr-load-places-${process.pid}.sql`);
  fs.writeFileSync(tmp, text);
  try {
    const out = execFileSync('npx', ['supabase', 'db', 'query', '--linked', '-o', 'json', '-f', tmp], {
      encoding: 'utf8', maxBuffer: 1 << 28, shell: process.platform === 'win32', stdio: ['ignore', 'pipe', 'pipe'],
    });
    return JSON.parse(out.slice(out.indexOf('{'))).rows;
  } finally {
    fs.rmSync(tmp, { force: true });
  }
}

function credit(keys) {
  return keys.map((k) => {
    const img = data.images[k];
    if (!img) throw new Error(`imagen desconocida: ${k}`);
    return `Foto: ${img.author}, ${img.license}, Wikimedia Commons.`;
  }).join('\n');
}
const withCredit = (text, keys) => (keys.length ? `${text}\n\n${credit(keys)}` : text);

// ---------------------------------------------------------------- estado actual
function readState() {
  const pts = data.places.map((p) => `(${lit(p.slug)}, ${Number(p.lng)}, ${Number(p.lat)})`).join(',\n  ');
  const rows = sql(`
with pts(slug, lng, lat) as (values
  ${pts}
), loc as (
  select p.slug, m.name as muni
  from pts p
  cross join lateral private.locate(extensions.st_setsrid(extensions.st_point(p.lng, p.lat), 4326)) l
  join public.municipalities m on m.id = l.municipality_id
), prov as (select id from public.provinces where code = ${lit(PROVINCE)})
select jsonb_build_object(
  'province', (select id from prov),
  'places', (select coalesce(jsonb_agg(jsonb_build_object(
      'id', t.id, 'slug', t.slug, 'name', t.name, 'muni', m.name, 'status', t.status, 'deleted', t.deleted_at is not null,
      'description', t.description, 'accessibility', t.accessibility, 'opening_info', t.opening_info, 'services', t.services,
      'photos', (select coalesce(jsonb_agg(a.id), '[]'::jsonb) from public.attachments a where a.tourism_place_id = t.id and a.status <> 'rejected'))), '[]'::jsonb)
    from public.tourism_places t join public.municipalities m on m.id = t.municipality_id where t.province_id = (select id from prov)),
  'routes', (select coalesce(jsonb_agg(jsonb_build_object(
      'id', r.id, 'slug', r.slug, 'name', r.name, 'status', r.status, 'deleted', r.deleted_at is not null, 'description', r.description,
      'photos', (select coalesce(jsonb_agg(a.id), '[]'::jsonb) from public.attachments a where a.eco_route_id = r.id and a.status <> 'rejected'))), '[]'::jsonb)
    from public.eco_routes r where r.province_id = (select id from prov)),
  'located', (select coalesce(jsonb_object_agg(slug, muni), '{}'::jsonb) from loc)
) as state;`);
  return rows[0].state;
}

// ---------------------------------------------------------------- plan
function planText(field, current, target, isOsm) {
  if (empty(target)) return null;
  if (current === target) return { field, action: 'igual' };
  if (empty(current) || isOsm(current)) return { field, action: 'escribir', value: target };
  return { field, action: 'manual', current };
}

function planPhotos(existing, keys, descriptionOk) {
  const out = [];
  let count = existing.length;
  for (const k of keys) {
    const id = photoId(data.images[k].file);
    if (existing.includes(id)) { out.push({ key: k, id, action: 'igual' }); continue; }
    if (!descriptionOk) { out.push({ key: k, id, action: 'sin_credito' }); continue; }
    if (count >= MAX_PHOTOS) { out.push({ key: k, id, action: 'limite' }); continue; }
    count++;
    out.push({ key: k, id, action: 'agregar' });
  }
  return out;
}

function buildPlan(state) {
  const plan = { places: [], routes: [], notes: [] };
  const placeOsm = (s) => /Ubicación de OpenStreetMap/.test(s); // texto de relleno de cargas antiguas de OSM
  for (const p of data.places) {
    const desc = withCredit(p.description, p.images);
    const match = state.places.find((x) => x.slug === p.slug)
      ?? state.places.find((x) => norm(x.name) === norm(p.name) && x.muni === p.municipality);
    if (!match) {
      const located = state.located[p.slug];
      if (located !== p.municipality) {
        plan.notes.push(`OMITIDO ${p.name}: la coordenada cae en "${located ?? 'ningún municipio'}", no en ${p.municipality}. Va a "por confirmar".`);
        continue;
      }
      plan.places.push({ p, action: 'crear', desc, photos: planPhotos([], p.images, true) });
      continue;
    }
    if (match.deleted || match.status !== 'published') {
      plan.notes.push(`OMITIDO ${p.name}: en la base está ${match.deleted ? 'borrado' : match.status}; no se toca.`);
      continue;
    }
    if (match.slug !== p.slug) plan.notes.push(`${p.name}: encontrado por nombre y municipio (slug en la base: ${match.slug}).`);
    const fields = [
      planText('description', match.description, desc, placeOsm),
      planText('accessibility', match.accessibility, p.accessibility, () => false),
      planText('opening_info', match.opening_info, p.opening_info, () => false),
    ].filter(Boolean);
    if (p.services && Object.keys(p.services).length) {
      const cur = JSON.stringify(match.services ?? {});
      const tgt = JSON.stringify(p.services);
      fields.push(cur === tgt ? { field: 'services', action: 'igual' } : cur === '{}' ? { field: 'services', action: 'escribir', value: p.services } : { field: 'services', action: 'manual', current: cur });
    }
    const d = fields.find((f) => f.field === 'description');
    const descOk = !!d && d.action !== 'manual';
    plan.places.push({ p, match, action: 'completar', fields, photos: planPhotos(match.photos, p.images, descOk) });
  }
  for (const r of data.routes) {
    const match = state.routes.find((x) => x.slug === r.slug);
    if (!match || match.deleted || match.status !== 'published') {
      plan.notes.push(`OMITIDA la ruta ${r.name}: ${match ? 'no está publicada' : 'no existe en la base'}.`);
      continue;
    }
    const target = withCredit(`${r.osm_description}\n\n${r.add}`, r.images);
    const f = planText('description', match.description, target, (s) => s === r.osm_description);
    plan.routes.push({ r, match, fields: [f], photos: planPhotos(match.photos, r.images, f.action !== 'manual') });
  }
  return plan;
}

function printPlan(plan) {
  const icon = { escribir: '+', igual: '=', manual: '!', agregar: '+', sin_credito: '!', limite: '!' };
  const say = {
    escribir: 'se completa', igual: 'ya está igual', manual: 'tiene texto propio del municipio: NO se toca',
    agregar: 'se agrega', sin_credito: 'NO se agrega (la descripción no es nuestra y no llevaría el crédito)', limite: 'NO se agrega (ya tiene 10 fotos)',
  };
  for (const x of plan.places) {
    console.log(`\n[${x.action === 'crear' ? 'CREAR' : 'COMPLETAR'}] ${x.p.name} · ${x.p.municipality} (${x.p.slug})`);
    if (x.action === 'crear') {
      console.log(`  + lugar nuevo publicado en ${x.p.lng}, ${x.p.lat} (${x.p.coord_source})`);
      for (const k of ['accessibility', 'opening_info']) if (x.p[k]) console.log(`  + ${k}`);
      console.log('  + description');
    }
    for (const f of x.fields ?? []) console.log(`  ${icon[f.action]} ${f.field}: ${say[f.action]}${f.action === 'manual' ? ` («${String(f.current).slice(0, 60)}…»)` : ''}`);
    for (const ph of x.photos) console.log(`  ${icon[ph.action]} foto ${data.images[ph.key].file}: ${say[ph.action]}`);
  }
  for (const x of plan.routes) {
    console.log(`\n[RUTA] ${x.r.name} (${x.r.slug})`);
    for (const f of x.fields) console.log(`  ${icon[f.action]} ${f.field}: ${say[f.action]}`);
    for (const ph of x.photos) console.log(`  ${icon[ph.action]} foto ${data.images[ph.key].file}: ${say[ph.action]}`);
  }
  if (plan.notes.length) console.log(`\nNotas:\n${plan.notes.map((n) => `  · ${n}`).join('\n')}`);
  const writes = plan.places.filter((x) => x.action === 'crear').length
    + [...plan.places, ...plan.routes].flatMap((x) => x.fields ?? []).filter((f) => f.action === 'escribir').length
    + [...plan.places, ...plan.routes].flatMap((x) => x.photos).filter((ph) => ph.action === 'agregar').length;
  const created = plan.places.filter((x) => x.action === 'crear').length;
  const photos = [...plan.places, ...plan.routes].flatMap((x) => x.photos).filter((ph) => ph.action === 'agregar').length;
  console.log(`\nResumen: ${created} lugares nuevos, ${writes - created - photos} campos a completar, ${photos} fotos nuevas.`);
  return writes;
}

// ---------------------------------------------------------------- fotos
async function commonsInfo(files) {
  const u = 'https://commons.wikimedia.org/w/api.php?' + new URLSearchParams({
    action: 'query', format: 'json', formatversion: '2', titles: files.join('|'), prop: 'imageinfo', iiprop: 'url|extmetadata', iiurlwidth: String(MAX_SIDE),
  });
  const r = await fetch(u, { headers: { 'User-Agent': UA } });
  if (!r.ok) throw new Error(`Commons respondió ${r.status}`);
  const d = await r.json();
  const map = new Map();
  for (const p of d.query.pages) map.set(p.title, p.imageinfo?.[0]);
  return map;
}

/** Comprueba que la licencia en Commons siga siendo la del JSON antes de publicar nada. */
function checkLicense(img, info) {
  const lic = (info?.extmetadata?.LicenseShortName?.value ?? '').replace(/<[^>]+>/g, '').trim();
  const expected = img.license === 'dominio público' ? /^public domain$/i : new RegExp(`^${img.license.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
  if (!expected.test(lic)) throw new Error(`La licencia de ${img.file} en Commons es "${lic}", no "${img.license}". No se publica nada.`);
}

async function processPhoto(url) {
  const r = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!r.ok) throw new Error(`descarga ${url}: ${r.status}`);
  const input = Buffer.from(await r.arrayBuffer());
  const { data: buf, info } = await sharp(input, { limitInputPixels: 40_000_000, animated: false })
    .rotate()
    .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: QUALITY })
    .toBuffer({ resolveWithObject: true });
  if (buf.length > MAX_BYTES) throw new Error('la foto procesada pasa de 5 MB');
  return { buf, width: info.width, height: info.height };
}

// ---------------------------------------------------------------- escritura
function writeSql(plan, uploaded) {
  const prov = `(select id from public.provinces where code = ${lit(PROVINCE)})`;
  const s = ['begin;'];
  for (const x of plan.places) {
    const p = x.p;
    if (x.action === 'crear') {
      const pt = `extensions.st_setsrid(extensions.st_point(${Number(p.lng)}, ${Number(p.lat)}), 4326)`;
      s.push(`insert into public.tourism_places (province_id, municipality_id, slug, name, kind, description, accessibility, opening_info, services, geom, status)
select l.province_id, l.municipality_id, ${lit(p.slug)}, ${lit(p.name)}, ${lit(p.kind)}, ${lit(x.desc)}, ${lit(p.accessibility)}, ${lit(p.opening_info)}, ${lit(JSON.stringify(p.services ?? {}))}::jsonb, ${pt}, 'published'
from private.locate(${pt}) l where l.province_id = ${prov}
on conflict (province_id, slug) do nothing;`);
    }
    for (const f of x.fields ?? []) {
      if (f.action !== 'escribir') continue;
      // compare-and-set: solo si el campo sigue vacío (o con el texto de OSM) en el momento de escribir
      const guard = f.field === 'services' ? `services = '{}'::jsonb`
        : f.field === 'description' ? `(description is null or btrim(description) = '' or description like '%Ubicación de OpenStreetMap%')`
          : `(${f.field} is null or btrim(${f.field}) = '')`;
      const value = f.field === 'services' ? `${lit(JSON.stringify(f.value))}::jsonb` : lit(f.value);
      s.push(`update public.tourism_places set ${f.field} = ${value} where id = ${lit(x.match.id)} and ${guard};`);
    }
  }
  for (const x of plan.routes) {
    const f = x.fields[0];
    if (f.action === 'escribir') {
      s.push(`update public.eco_routes set description = ${lit(f.value)} where id = ${lit(x.match.id)} and (description is null or description = ${lit(x.r.osm_description)});`);
    }
  }
  for (const u of uploaded) {
    const parent = u.kind === 'place'
      ? `(select id from public.tourism_places where province_id = ${prov} and slug = ${lit(u.slug)})`
      : `(select id from public.eco_routes where province_id = ${prov} and slug = ${lit(u.slug)})`;
    const col = u.kind === 'place' ? 'tourism_place_id' : 'eco_route_id';
    s.push(`insert into public.attachments (id, ${col}, bucket, path, mime, bytes, width, height, status)
select ${lit(u.id)}, ${parent}, '${BUCKET}', ${lit(u.path)}, 'image/webp', ${u.bytes}, ${u.width}, ${u.height}, 'approved'
where ${parent} is not null
on conflict do nothing;`);
  }
  s.push('commit;');
  s.push(`select 'ok' as resultado;`);
  return s.join('\n');
}

async function main() {
  console.log(`${DRY ? 'SIMULACIÓN (--dry-run): no se escribe nada' : 'CARGA REAL'} · ${FILE}`);
  const state = readState();
  if (!state.province) throw new Error(`No existe la provincia ${PROVINCE} en la base.`);
  const plan = buildPlan(state);
  const writes = printPlan(plan);
  if (DRY || writes === 0) {
    if (!DRY) console.log('\nNada que escribir: la base ya tiene este contenido.');
    return;
  }

  try { process.loadEnvFile('.env.local'); } catch { /* las variables pueden venir del entorno */ }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const toAdd = [
    ...plan.places.flatMap((x) => x.photos.filter((ph) => ph.action === 'agregar').map((ph) => ({ ...ph, kind: 'place', slug: x.p.slug }))),
    ...plan.routes.flatMap((x) => x.photos.filter((ph) => ph.action === 'agregar').map((ph) => ({ ...ph, kind: 'route', slug: x.r.slug }))),
  ];
  const uploaded = [];
  if (toAdd.length) {
    if (!url || !key) throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY (en .env.local) para subir las fotos.');
    const supabase = createClient(url, key, { auth: { persistSession: false } });
    const info = await commonsInfo([...new Set(toAdd.map((t) => data.images[t.key].file))]);
    for (const t of toAdd) checkLicense(data.images[t.key], info.get(data.images[t.key].file));
    console.log('');
    for (const t of toAdd) {
      const ii = info.get(data.images[t.key].file);
      const img = await processPhoto(ii.thumburl ?? ii.url);
      const p = `processed/${t.id}.webp`;
      const up = await supabase.storage.from(BUCKET).upload(p, img.buf, { contentType: 'image/webp', upsert: true, cacheControl: '31536000' });
      if (up.error) throw new Error(`subida ${p}: ${up.error.message}`);
      console.log(`  subida ${BUCKET}/${p} · ${img.width}×${img.height} · ${(img.buf.length / 1024).toFixed(0)} KB · ${data.images[t.key].file}`);
      uploaded.push({ ...t, path: p, bytes: img.buf.length, width: img.width, height: img.height });
    }
  }

  const before = {
    places: plan.places.filter((x) => x.match).map((x) => ({ id: x.match.id, slug: x.match.slug, description: x.match.description, accessibility: x.match.accessibility, opening_info: x.match.opening_info, services: x.match.services })),
    routes: plan.routes.map((x) => ({ id: x.match.id, slug: x.match.slug, description: x.match.description })),
  };
  fs.mkdirSync('backups', { recursive: true });
  const log = `backups/load-places-${new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '')}.json`;
  fs.writeFileSync(log, JSON.stringify({
    created_at: new Date().toISOString(),
    created_places: plan.places.filter((x) => x.action === 'crear').map((x) => x.p.slug),
    attachments: uploaded.map((u) => ({ id: u.id, bucket: BUCKET, path: u.path, entity: u.kind, slug: u.slug })),
    before,
  }, null, 1));

  sql(writeSql(plan, uploaded));
  console.log(`\nEscrito. Registro para revertir: ${log}`);

  const after = buildPlan(readState());
  const pending = [...after.places, ...after.routes].flatMap((x) => [...(x.fields ?? []), ...x.photos]).filter((f) => ['escribir', 'agregar'].includes(f.action)).length
    + after.places.filter((x) => x.action === 'crear').length;
  console.log(pending === 0 ? 'Comprobación: correrlo otra vez no cambiaría nada (idempotente).' : `Comprobación: quedan ${pending} cambios sin aplicar; revisar.`);
  if (pending) process.exitCode = 1;
}

main().catch((e) => {
  console.error(`\nERROR: ${e.message}`);
  console.error('No se aplicó ningún cambio en la base si el error ocurrió antes de "Escrito." (todo va en una sola transacción).');
  console.error('Si ya se subieron fotos, quedan en public-media sin ficha: se pueden borrar o se reutilizan al volver a correr el script.');
  process.exit(1);
});
