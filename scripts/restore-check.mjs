// Simulacro de restauración: demuestra que una copia de seguridad se puede volver a cargar.
// 1. Toma la copia más reciente de backups/ (o la ruta que se le pase).
// 2. Si viene cifrada (openssl enc, como la del workflow backup.yml), la descifra en memoria con BACKUP_PASSPHRASE.
// 3. La carga en una PGlite nueva (PostgreSQL + PostGIS en WebAssembly) con todas las migraciones.
// 4. Compara los conteos por tabla y revisa que no queden claves foráneas huérfanas. Termina con error si algo falla.
// Acepta el JSON de `npm run backup` y el pg_dump (formato custom) del workflow, cifrados o no.
// Nunca escribe en disco la copia descifrada ni muestra datos: solo nombres de tabla y conteos.
// Uso: npm run backup:check [-- <ruta a la copia>]     (DEPLOYMENT.md §8.1)
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const fail = (msg) => { console.error(`\n✗ ${msg}`); process.exit(1); };
// Los mensajes de PostgreSQL pueden citar valores de la copia: se tapan antes de mostrarlos
const safe = (e) => `${e.code ? `[${e.code}] ` : ''}${String(e.message).replace(/"[^"]*"/g, '"…"').replace(/'[^']*'/g, "'…'").slice(0, 200)}`;

// ---------------------------------------------------------------------------------------------
// 1. Elegir la copia
// ---------------------------------------------------------------------------------------------
const BACKUP_RE = /\.(json|dump)(\.enc)?$/;
// Un archivo, o la copia más reciente de una carpeta (también dentro de subcarpetas, como las deja `gh run download`)
function pickFile(arg = 'backups') {
  const full = path.resolve(process.env.INIT_CWD ?? '.', arg); // npm run cambia el directorio a la raíz
  if (!fs.existsSync(full)) fail(arg === 'backups' ? 'No hay carpeta backups/. Crea una copia con `npm run backup` o pasa la ruta: npm run backup:check -- <archivo>' : `No existe ${arg}`);
  if (fs.statSync(full).isFile()) return full;
  const found = fs.readdirSync(full, { recursive: true }).map((f) => path.join(full, f))
    .filter((f) => BACKUP_RE.test(f) && fs.statSync(f).isFile());
  if (!found.length) fail(`No hay copias (.json, .dump, .enc) en ${arg}. Crea una con \`npm run backup\` o pasa la ruta del archivo`);
  return found.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0];
}

// ---------------------------------------------------------------------------------------------
// 2. Descifrar: mismo formato que `openssl enc -aes-256-cbc -pbkdf2 -iter 200000 -salt` (backup.yml)
// ---------------------------------------------------------------------------------------------
function passphrase() {
  if (!process.env.BACKUP_PASSPHRASE) {
    try { process.loadEnvFile('.env.local'); } catch { /* sin .env.local */ }
  }
  const pass = process.env.BACKUP_PASSPHRASE?.trim();
  if (!pass) fail('La copia está cifrada y falta BACKUP_PASSPHRASE (en el entorno o en .env.local)');
  return pass;
}
function decrypt(buf) {
  const salt = buf.subarray(8, 16);
  const km = crypto.pbkdf2Sync(passphrase(), salt, 200000, 48, 'sha256');
  const d = crypto.createDecipheriv('aes-256-cbc', km.subarray(0, 32), km.subarray(32));
  try {
    return Buffer.concat([d.update(buf.subarray(16)), d.final()]);
  } catch {
    return fail('No se pudo descifrar: la frase BACKUP_PASSPHRASE no corresponde a esta copia');
  }
}

// ---------------------------------------------------------------------------------------------
// 3a. JSON de `npm run backup`: { created_at, tables: { <tabla>: [filas] } } (todo de public)
// ---------------------------------------------------------------------------------------------
function readJson(buf) {
  const { created_at, tables } = JSON.parse(buf.toString('utf8'));
  if (!tables || typeof tables !== 'object') fail('El JSON no tiene la forma de `npm run backup` (falta "tables")');
  return {
    kind: 'JSON de npm run backup',
    createdAt: created_at,
    entries: Object.entries(tables).map(([table, rows]) => ({ schema: 'public', table, rows, count: rows.length })),
  };
}

// ---------------------------------------------------------------------------------------------
// 3b. pg_dump --format=custom (backup.yml). Lector mínimo del formato de archivo de pg_dump
//     (src/bin/pg_dump/pg_backup_archiver.c y pg_backup_custom.c): cabecera, índice (TOC) y
//     bloques de datos. Solo hace falta el texto de COPY de cada tabla; no se necesita pg_restore.
// ---------------------------------------------------------------------------------------------
function readDump(buf) {
  let p = 5;
  const [vmaj, vmin] = [buf[p++], buf[p++]];
  p++; // revisión
  const intSize = buf[p++];
  const offSize = buf[p++];
  if (vmaj !== 1 || vmin < 14) fail(`Versión de archivo de pg_dump no soportada (${vmaj}.${vmin})`);
  if (buf[p++] !== 1) fail('El pg_dump no está en formato custom (--format=custom)');
  const int = () => {
    const neg = buf[p++];
    let v = 0;
    for (let i = 0; i < intSize; i++) v += buf[p + i] * 2 ** (8 * i);
    p += intSize;
    return neg ? -v : v;
  };
  const str = () => {
    const n = int();
    if (n < 0) return null;
    const s = buf.toString('utf8', p, p + n);
    p += n;
    return s;
  };
  // Compresión: desde 1.15 un byte con el algoritmo (0 ninguno, 1 gzip, 2 lz4, 3 zstd); antes, el nivel
  const algo = vmin >= 15 ? buf[p++] : int() === 0 ? 0 : 1;
  if (algo > 1) fail('El pg_dump usa lz4 o zstd; este lector solo admite gzip o sin compresión');
  for (let i = 0; i < 7; i++) int(); // fecha de creación
  str(); str(); str(); // base, versión del servidor, versión de pg_dump

  const toc = new Map();
  const tocCount = int();
  for (let i = 0; i < tocCount; i++) {
    const id = int();
    int(); // hadDumper
    str(); str(); // tableoid, oid
    const tag = str();
    const desc = str();
    int(); // sección
    str(); str(); // defn, dropStmt
    const copyStmt = str();
    const namespace = str();
    str(); str(); // tablespace, tableam
    if (vmin >= 16) int(); // relkind
    str(); str(); // owner, withOids
    while (str() !== null); // dependencias
    p += 1 + offSize; // posición del bloque de datos (no se usa: se lee en orden)
    if (desc === 'TABLE DATA') toc.set(id, { schema: namespace, table: tag, copyStmt });
  }

  const entries = [];
  while (p < buf.length) {
    const type = buf[p++];
    const id = int();
    const chunks = [];
    if (type === 3) { // BLK_BLOBS: objetos grandes, la app no los usa → se saltan
      while (int() !== 0) for (let n = int(); n !== 0; n = int()) p += n;
      continue;
    }
    if (type !== 1) fail(`Bloque de datos desconocido (${type}) en el pg_dump`);
    for (let n = int(); n !== 0; n = int()) { chunks.push(buf.subarray(p, p + n)); p += n; }
    const te = toc.get(id);
    if (!te) continue;
    const raw = Buffer.concat(chunks);
    let text = (algo === 1 && raw.length ? zlib.inflateSync(raw) : raw).toString('utf8');
    text = text.replace(/(^|\n)\\\.\n*$/, '$1'); // pg_dump cierra cada COPY con "\.\n\n\n"
    const columns = /\(([^)]*)\)\s+FROM stdin/i.exec(te.copyStmt)?.[1].split(',').map((c) => c.trim().replace(/^"|"$/g, '')) ?? [];
    entries.push({ ...te, columns, text, count: text ? text.split('\n').length - (text.endsWith('\n') ? 1 : 0) : 0 });
  }
  return { kind: `pg_dump custom ${vmaj}.${vmin}`, entries };
}

// ---------------------------------------------------------------------------------------------
// 4. Restaurar en PGlite con todas las migraciones y comparar
// ---------------------------------------------------------------------------------------------
const file = pickFile(process.argv[2]);
let buf = fs.readFileSync(file);
const encrypted = buf.subarray(0, 8).toString('latin1') === 'Salted__';
if (encrypted) buf = decrypt(buf);
const head = buf.subarray(0, 5).toString('latin1');
const backup = head === 'PGDMP' ? readDump(buf) : head.trimStart().startsWith('{') ? readJson(buf) : fail('Formato de copia desconocido');
buf = null;

let createDb;
try {
  ({ createDb } = await import('../supabase/tests/db.mjs'));
} catch {
  fail('Falta PGlite: corre `npm --prefix supabase/tests ci` una vez');
}
console.log(`Copia: ${path.basename(file)}${encrypted ? ' (cifrada, descifrada en memoria)' : ''} · ${backup.kind}`);
const t0 = Date.now();
const { db, files } = await createDb({ seed: false });
console.log(`PGlite nueva con ${files.length} migraciones (${((Date.now() - t0) / 1000).toFixed(1)} s)`);

const q = async (sql, params = []) => (await db.query(sql, params)).rows;
const ident = (s) => `"${s.replace(/"/g, '""')}"`;
const rel = (e) => `${ident(e.schema)}.${ident(e.table)}`;
// Columnas que se pueden escribir (sin las generadas) y su tipo
const targetColumns = async (e) => new Map((await q(
  `select a.attname, format_type(a.atttypid, a.atttypmod) as type from pg_attribute a
   join pg_class c on c.oid = a.attrelid join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = $1 and c.relname = $2 and c.relkind in ('r', 'p') and a.attnum > 0 and not a.attisdropped and a.attgenerated = ''`,
  [e.schema, e.table])).map((r) => [r.attname, r.type]));

// Se restauran los esquemas de la app y, de los de Supabase (en PGlite son stubs), las tablas que la app referencia
const APP_SCHEMAS = new Set(['public', 'private']);
const SUPABASE_TABLES = new Set(['auth.users', 'storage.buckets', 'storage.objects']);
const loadable = [];
const skipped = [];
for (const e of backup.entries) {
  const cols = await targetColumns(e);
  if (!cols.size || !(APP_SCHEMAS.has(e.schema) || SUPABASE_TABLES.has(`${e.schema}.${e.table}`))) { skipped.push(e); continue; }
  loadable.push({ ...e, cols });
}
const lostTables = skipped.filter((e) => APP_SCHEMAS.has(e.schema));
if (lostTables.length) console.warn(`Tablas de la copia que ya no existen en las migraciones: ${lostTables.map(rel).join(', ')}`);

// Igual que pg_restore --clean --disable-triggers: vaciar, cargar sin disparadores ni FK y validar después
await db.exec('set session_replication_role = replica');
if (loadable.length) await db.exec(`truncate ${loadable.map(rel).join(', ')} restart identity cascade`);
const errors = [];
for (const e of loadable) {
  try {
    if (e.rows) {
      const keys = new Set(e.rows.flatMap((r) => Object.keys(r)));
      const common = [...e.cols.keys()].filter((c) => keys.has(c));
      if (e.rows.length && common.length) {
        await db.query(`insert into ${rel(e)} (${common.map(ident).join(', ')}) overriding system value
                        select ${common.map(ident).join(', ')} from jsonb_populate_recordset(null::${rel(e)}, $1::jsonb)`,
        [JSON.stringify(e.rows)]);
      }
    } else if (e.count) {
      const common = e.columns.filter((c) => e.cols.has(c));
      await db.exec(`create temp table _restore (${e.columns.map((c) => `${ident(c)} text`).join(', ')})`);
      await db.query(`copy _restore from '/dev/blob'`, [], { blob: new Blob([e.text]) });
      await db.exec(`insert into ${rel(e)} (${common.map(ident).join(', ')}) overriding system value
                     select ${common.map((c) => `${ident(c)}::${e.cols.get(c)}`).join(', ')} from _restore;
                     drop table _restore`);
    }
  } catch (err) {
    errors.push(`${rel(e)}: ${safe(err)}`);
    await db.exec('drop table if exists _restore');
  }
}
await db.exec('set session_replication_role = origin');

// Conteos
const rows = [];
for (const e of loadable) {
  const [{ n }] = await q(`select count(*)::int as n from ${rel(e)}`);
  rows.push({ table: e.schema === 'public' ? e.table : `${e.schema}.${e.table}`, expected: e.count, restored: n, ok: n === e.count });
}

// Integridad referencial: ninguna fila apunta a una que no existe (solo FK entre tablas restauradas)
const loadedSet = new Set(loadable.map(rel));
const fks = await q(`
  select c.conname, ch.nspname as cs, cc.relname as ct, ph.nspname as ps, pc.relname as pt,
         (select array_agg(a.attname order by k.i) from unnest(c.conkey) with ordinality k(n, i)
            join pg_attribute a on a.attrelid = c.conrelid and a.attnum = k.n) as ccols,
         (select array_agg(a.attname order by k.i) from unnest(c.confkey) with ordinality k(n, i)
            join pg_attribute a on a.attrelid = c.confrelid and a.attnum = k.n) as pcols
  from pg_constraint c
  join pg_class cc on cc.oid = c.conrelid join pg_namespace ch on ch.oid = cc.relnamespace
  join pg_class pc on pc.oid = c.confrelid join pg_namespace ph on ph.oid = pc.relnamespace
  where c.contype = 'f'`);
let fkChecked = 0;
for (const fk of fks) {
  const child = `${ident(fk.cs)}.${ident(fk.ct)}`;
  const parent = `${ident(fk.ps)}.${ident(fk.pt)}`;
  if (!loadedSet.has(child) || !loadedSet.has(parent)) continue;
  fkChecked++;
  const [{ n }] = await q(`select count(*)::int as n from ${child} c where ${fk.ccols.map((col) => `c.${ident(col)} is not null`).join(' and ')}
    and not exists (select 1 from ${parent} p where ${fk.ccols.map((col, i) => `p.${ident(fk.pcols[i])} = c.${ident(col)}`).join(' and ')})`);
  if (n) errors.push(`${fk.ct} → ${fk.pt} (${fk.conname}): ${n} filas huérfanas`);
}
await db.close();

// Informe (solo nombres de tabla y conteos: nada de datos)
const w = Math.max(5, ...rows.map((r) => r.table.length));
console.log(`\n${'Tabla'.padEnd(w)}  Copia  Restaurada`);
for (const r of rows) console.log(`${r.table.padEnd(w)}  ${String(r.expected).padStart(5)}  ${String(r.restored).padStart(10)}  ${r.ok ? '✓' : '✗'}`);
const total = (k) => rows.reduce((s, r) => s + r[k], 0);
console.log(`${'TOTAL'.padEnd(w)}  ${String(total('expected')).padStart(5)}  ${String(total('restored')).padStart(10)}`);
const extra = skipped.filter((e) => !APP_SCHEMAS.has(e.schema) && e.count);
if (extra.length) console.log(`\nNo se cargan en PGlite (tablas internas de Supabase): ${extra.map((e) => `${e.schema}.${e.table}:${e.count}`).join('  ')}`);
console.log(`Claves foráneas revisadas: ${fkChecked}`);

const mismatched = rows.filter((r) => !r.ok);
if (mismatched.length || errors.length || lostTables.length) {
  for (const e of errors) console.error(`  - ${e}`);
  for (const r of mismatched) console.error(`  - ${r.table}: la copia tiene ${r.expected} filas y se restauraron ${r.restored}`);
  fail('El simulacro de restauración FALLÓ');
}
console.log(`\n✓ Restauración correcta: ${rows.length} tablas, ${total('restored')} filas, sin claves foráneas huérfanas`);
