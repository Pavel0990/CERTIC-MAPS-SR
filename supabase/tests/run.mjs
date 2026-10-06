// Suite de pruebas de la base de datos de SR Conecta.
// Ejecuta las migraciones reales y prueba seguridad (RLS, grants, ataques directos), integridad,
// concurrencia (compare-and-set, idempotencia), PostGIS, KPIs/PDF y mantenimiento.
// Uso:  cd supabase/tests && npm install && npm test
import { createDb, as } from './db.mjs';

const results = [];
const ok = (name, cond, detail = '') => results.push({ name, pass: !!cond, detail: String(detail ?? '') });
const expectError = async (name, fn, re) => {
  try { await fn(); ok(name, false, 'no lanzó error'); }
  catch (e) { ok(name, re.test(e.message), e.message); }
};

const { db, files } = await createDb();
let lastStep = 'inicio';
try {
const q = async (sql, params = []) => (await db.query(sql, params)).rows;
const one = async (sql, params = []) => (await q(sql, params))[0];
const rpc = async (who, sql, params = []) => (await as(db, who, `select ${sql} as r`, params)).rows[0].r;

// Puntos de prueba (seed: rectángulos demo por municipio)
const P = {
  SAB: [19.4752, -71.3412], SAB2: [19.4700, -71.3450], MON: [19.4167, -71.1680], VLA: [19.4110, -71.4415],
  SAB_EDGE: [19.5290, -71.3412],   // ~1 km fuera del borde norte de Sabaneta → se asigna a Sabaneta
  SANTO_DOMINGO: [18.4700, -69.9000],
};
const muni = Object.fromEntries((await q(`select code, id from public.municipalities`)).map(r => [r.code, r.id]));
const provinceId = (await one(`select id from public.provinces where code = 'SR'`)).id;

// ---------------------------------------------------------------------------------------------
// A. Estructura y permisos globales
// ---------------------------------------------------------------------------------------------
const noRls = await q(`select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
                       where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity`);
ok('A1 RLS activado en todas las tablas de public', noRls.length === 0, noRls.map(r => r.relname).join(', '));

const anonExec = await q(`select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                          where n.nspname = 'public' and has_function_privilege('anon', p.oid, 'execute') order by 1`);
ok('A2 anon solo ejecuta map_aggregates, map_features, search_all y track_engagement', anonExec.map(r => r.proname).join(',') === 'map_aggregates,map_features,search_all,track_engagement',
   anonExec.map(r => r.proname).join(','));

const anonWrite = await q(`select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
                           where n.nspname = 'public' and c.relkind = 'r'
                             and (has_table_privilege('anon', c.oid, 'insert') or has_table_privilege('anon', c.oid, 'update')
                                  or has_table_privilege('anon', c.oid, 'delete'))`);
ok('A3 anon no puede escribir en ninguna tabla', anonWrite.length === 0, anonWrite.map(r => r.relname).join(', '));

const authWrite = await q(`select c.relname, p.priv from pg_class c join pg_namespace n on n.oid = c.relnamespace,
                           unnest(array['INSERT','UPDATE','DELETE']) p(priv)
                           where n.nspname = 'public' and c.relkind = 'r' and has_table_privilege('authenticated', c.oid, p.priv)
                             and c.relname in ('traffic_reports','citizen_requests','businesses','user_roles','request_votes',
                                               'tourism_places','eco_routes','audit_logs','moderation_actions','report_runs')`);
ok('A4 authenticated sin escritura directa en tablas críticas', authWrite.length === 0,
   authWrite.map(r => r.relname + ':' + r.priv).join(', '));

const privExec = await q(`select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                          where n.nspname = 'private' and has_function_privilege('authenticated', p.oid, 'execute') order by 1`);
ok('A5 authenticated solo ejecuta los helpers de RLS en private',
   privExec.map(r => r.proname).join(',') === 'can_read_request,f_unaccent,is_admin,is_any_staff,is_business_member,is_provincial_admin,is_service,is_staff,local_today,reject,report_download_granted,upload_quota_ok',
   privExec.map(r => r.proname).join(','));

const definerNoPath = await q(`select n.nspname || '.' || p.proname f from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                               where n.nspname in ('public','private') and p.prosecdef
                                 and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%')`);
ok('A6 toda función SECURITY DEFINER fija search_path', definerNoPath.length === 0, definerNoPath.map(r => r.f).join(', '));

const fkNoIndex = await q(`
  select c.conrelid::regclass::text || '(' || string_agg(a.attname, ',') || ')' as fk
  from pg_constraint c
  join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
  join pg_namespace n on n.oid = (select relnamespace from pg_class where oid = c.conrelid)
  where c.contype = 'f' and n.nspname = 'public' and c.confrelid = 'public.profiles'::regclass
    and not exists (select 1 from pg_index i where i.indrelid = c.conrelid
                    and (i.indkey::int2[])[0:cardinality(c.conkey) - 1] @> c.conkey)
  group by c.conrelid, c.conname`);
ok('A7 toda FK hacia profiles tiene índice (borrado de cuentas sin recorridos completos)', fkNoIndex.length === 0, fkNoIndex.map(r => r.fk).join(' · '));

// ---------------------------------------------------------------------------------------------
// B. Identidad: alta automática, perfiles y escalada de privilegios
// ---------------------------------------------------------------------------------------------
const newUser = async (email, name) => (await one(
  `insert into auth.users (email, raw_user_meta_data) values ($1, jsonb_build_object('display_name', $2::text)) returning id`, [email, name])).id;
const U = {
  ana: await newUser('ana@ejemplo.do', 'Ana'),
  beto: await newUser('beto@ejemplo.do', 'Beto'),
  cris: await newUser('cris@ejemplo.do', 'Cris'),
  modSab: await newUser('mod.sab@ejemplo.do', 'Moderador Sabaneta'),
  modMon: await newUser('mod.mon@ejemplo.do', 'Moderador Monción'),
  admMon: await newUser('adm.mon@ejemplo.do', 'Admin Monción'),
  admProv: await newUser('adm.prov@ejemplo.do', 'Admin Provincial'),
};
// Script de operación (ADR-020): el personal inicial se crea con permisos de servicio
await db.query(`insert into public.user_roles (user_id, role, province_id, municipality_id) values
  ($1, 'moderator', $5, $6), ($2, 'moderator', $5, $7), ($3, 'municipal_admin', $5, $7), ($4, 'municipal_admin', $5, null)`,
  [U.modSab, U.modMon, U.admMon, U.admProv, provinceId, muni.SAB, muni.MON]);

const anaProfile = await one(`select p.display_name, array_agg(r.role) roles from public.profiles p
                              join public.user_roles r on r.user_id = p.id where p.id = $1 group by p.display_name`, [U.ana]);
ok('B1 el registro crea perfil y rol citizen', anaProfile.display_name === 'Ana' && anaProfile.roles.join() === 'citizen');

await expectError('B2 ciudadano no puede autoasignarse un rol',
  () => as(db, U.ana, `insert into public.user_roles (user_id, role, province_id) values ($1, 'municipal_admin', $2)`, [U.ana, provinceId]),
  /permission denied/);
await expectError('B3 ciudadano no puede subir su reputación',
  () => as(db, U.ana, `update public.profiles set reputation = 100 where id = $1`, [U.ana]), /permission denied/);
await as(db, U.ana, `update public.profiles set display_name = 'Ana María' where id = $1`, [U.ana]);
const hijack = await as(db, U.ana, `update public.profiles set display_name = 'hackeado' where id = $1`, [U.beto]);
ok('B4 edita su nombre pero no el de otro (RLS: 0 filas)',
   (await one(`select display_name from public.profiles where id = $1`, [U.ana])).display_name === 'Ana María'
   && hijack.affectedRows === 0 && (await one(`select display_name from public.profiles where id = $1`, [U.beto])).display_name === 'Beto');

// ---------------------------------------------------------------------------------------------
// C. Territorio y PostGIS
// ---------------------------------------------------------------------------------------------
const loc = async ([lat, lng]) => (await one(`select m.code from private.locate(private.make_point($1, $2)) l
                                              join public.municipalities m on m.id = l.municipality_id`, [lat, lng]))?.code ?? null;
ok('C1 punto dentro de Sabaneta → SAB', await loc(P.SAB) === 'SAB');
ok('C2 punto a ~1 km del borde → municipio más cercano (tolerancia GPS)', await loc(P.SAB_EDGE) === 'SAB');
ok('C3 punto fuera de la provincia → sin municipio', await loc(P.SANTO_DOMINGO) === null);
ok('C4 coordenadas inválidas → NULL', (await one(`select private.make_point(95, -71) is null v`)).v === true);

await db.query(`insert into public.provinces (code, name) values ('XX', 'Otra provincia')`);
const otherProv = (await one(`select id from public.provinces where code = 'XX'`)).id;
await expectError('C5 FK compuesta: un rol no puede mezclar municipio y provincia distintos',
  () => db.query(`insert into public.user_roles (user_id, role, province_id, municipality_id) values ($1, 'moderator', $2, $3)`,
                 [U.cris, otherProv, muni.SAB]), /foreign key/);
await expectError('C6 NULLS NOT DISTINCT: no se duplica un rol provincial',
  () => db.query(`insert into public.user_roles (user_id, role, province_id, municipality_id) values ($1, 'municipal_admin', $2, null)`,
                 [U.admProv, provinceId]), /duplicate key/);

// ---------------------------------------------------------------------------------------------
// D. Reportes de tránsito (F4)
// ---------------------------------------------------------------------------------------------
const createTraffic = (who, [lat, lng], key, type = 'bache') =>
  rpc(who, `public.create_traffic_report($1, $2, $3, $4)`, [type, lat, lng, key]);

await expectError('D1 anon no puede crear reportes', () => createTraffic(null, P.SAB, 'anon-key-0001'), /permission denied/);
const t1 = await createTraffic(U.ana, P.SAB, 'ana-traffic-0001');
const t1row = await one(`select status, municipality_id, reporter_id from public.traffic_reports where id = $1`, [t1.id]);
ok('D2 reporte creado pendiente y ubicado en Sabaneta', t1.status === 'ok' && t1row.status === 'pending' && t1row.municipality_id === muni.SAB);
const t1dup = await createTraffic(U.ana, P.SAB, 'ana-traffic-0001');
ok('D3 idempotencia: misma clave devuelve el mismo reporte', t1dup.id === t1.id && t1dup.duplicate === true);
const tBad = await rpc(U.ana, `public.create_traffic_report('bache', 200, -71, 'ana-traffic-0002')`);
ok('D4 coordenadas inválidas → rechazo (no excepción)', tBad.reason === 'invalid_coordinates');
const tOut = await createTraffic(U.ana, P.SANTO_DOMINGO, 'ana-traffic-0003');
ok('D5 fuera de la provincia → out_of_area', (await one(`select status from public.traffic_reports where id = $1`, [tOut.id])).status === 'out_of_area');
const tType = await rpc(U.ana, `public.create_traffic_report('ovni', 19.47, -71.34, 'ana-traffic-0004')`);
ok('D6 tipo inexistente → invalid_type', tType.reason === 'invalid_type');

for (let i = 0; i < 5; i++) await rpc(U.beto, `public.create_traffic_report('bache', 999, 999, $1)`, [`beto-bad-${i}-xxxx`]);
const limited = await createTraffic(U.beto, P.SAB, 'beto-ok-00001');
ok('D7 rate limit: los intentos rechazados también cuentan (6º bloqueado)', limited.reason === 'rate_limited', JSON.stringify(limited));

const bbox = `public.map_features(-71.5, 19.3, -71.0, 19.6, array['traffic'])`;
const before = (await rpc(null, bbox)).features.length;
const modWrong = await rpc(U.modMon, `public.moderate_traffic_report($1, 'pending', 'active')`, [t1.id]);
ok('D8 moderador de Monción no modera Sabaneta (forbidden)', modWrong.reason === 'forbidden');
ok('D9 el intento denegado queda auditado',
   (await one(`select count(*)::int n from public.audit_logs where entity_id = $1 and result = 'denied'`, [t1.id])).n === 1);
const skip = await rpc(U.modSab, `public.moderate_traffic_report($1, 'pending', 'resolved')`, [t1.id]);
ok('D10 transición inválida pending→resolved rechazada', skip.reason === 'invalid_transition');
const act = await rpc(U.modSab, `public.moderate_traffic_report($1, 'pending', 'active')`, [t1.id]);
const stale = await rpc(U.modSab, `public.moderate_traffic_report($1, 'pending', 'rejected', 'duplicado')`, [t1.id]);
ok('D11 compare-and-set: el segundo moderador recibe stale_state', act.status === 'ok' && stale.reason === 'stale_state'
   && stale.current_status === 'active', JSON.stringify(stale));
const after = (await rpc(null, bbox)).features;
ok('D12 el mapa público muestra el reporte solo al activarse', before === 0 && after.some(f => f.properties.id === t1.id));
await expectError('D13 anon no puede leer el autor del reporte (grant por columna)',
  () => as(db, null, `select reporter_id from public.traffic_reports`), /permission denied/);
const sent = await one(`select payload from realtime.sent where payload->>'id' = $1 order by at desc limit 1`, [t1.id]);
ok('D14 alerta en vivo emitida por Realtime sin datos personales',
   sent && sent.payload.status === 'active' && !('reporter_id' in sent.payload));
await expectError('D15 ciudadano no puede cambiar el estado directamente',
  () => as(db, U.ana, `update public.traffic_reports set status = 'resolved' where id = $1`, [t1.id]), /permission denied/);
ok('D16 reputación del autor sube al verificarse',
   (await one(`select reputation from public.profiles where id = $1`, [U.ana])).reputation === 1);
const esc = await rpc(U.modSab, `public.escalate_traffic_report($1)`, [t1.id]);
const esc2 = await rpc(U.modSab, `public.escalate_traffic_report($1)`, [t1.id]);
const escReq = await one(`select status, requester_id, kind from public.citizen_requests where id = $1`, [esc.request_id]);
ok('D17 escalado a incidencia municipal (una sola vez, conserva al autor)',
   esc.status === 'ok' && esc2.duplicate === true && escReq.status === 'approved' && escReq.requester_id === U.ana && escReq.kind === 'incident');

// ---------------------------------------------------------------------------------------------
// E. Incidencias y consultas (F5)
// ---------------------------------------------------------------------------------------------
const inq = await rpc(U.ana, `public.create_citizen_request('inquiry', 'consulta', 'Horario de la oficina', 'Quisiera saber el horario del ayuntamiento.', 'ana-req-00001', null, null, $1)`, [muni.SAB]);
ok('E1 consulta sin ubicación con municipio elegido', inq.status === 'ok', JSON.stringify(inq));
const noLoc = await rpc(U.ana, `public.create_citizen_request('incident', 'basura', 'Basura acumulada', 'Hay basura acumulada en la esquina.', 'ana-req-00002')`);
ok('E2 incidencia sin ubicación → location_required', noLoc.reason === 'location_required');
const badCat = await rpc(U.ana, `public.create_citizen_request('inquiry', 'basura', 'Mezcla', 'Categoría de incidencia en una consulta.', 'ana-req-00003', null, null, $1)`, [muni.SAB]);
ok('E3 categoría de otro tipo → invalid_category', badCat.reason === 'invalid_category');
const inc = await rpc(U.ana, `public.create_citizen_request('incident', 'alumbrado', 'Poste sin luz', 'El poste de la esquina lleva una semana apagado.', 'ana-req-00004', $1, $2)`, P.SAB2);
ok('E4 incidencia con ubicación creada', inc.status === 'ok');
const bSees = await as(db, U.beto, `select id from public.citizen_requests where id = $1`, [inc.id]);
const aSees = await as(db, U.ana, `select id from public.citizen_requests where id = $1`, [inc.id]);
ok('E5 RLS: otro ciudadano no ve una solicitud privada; la autora sí', bSees.rows.length === 0 && aSees.rows.length === 1);
const citizenMove = await rpc(U.ana, `public.change_request_status($1, 'pending', 'under_review')`, [inc.id]);
ok('E6 la autora no puede mover su propia solicitud', citizenMove.reason === 'forbidden');
const s1 = await rpc(U.modSab, `public.change_request_status($1, 'pending', 'under_review')`, [inc.id]);
const s2 = await rpc(U.modSab, `public.change_request_status($1, 'under_review', 'approved')`, [inc.id]);
const s3 = await rpc(U.modSab, `public.change_request_status($1, 'approved', 'in_progress')`, [inc.id]);
ok('E7 in_progress exige asignación', s1.status === 'ok' && s2.status === 'ok' && s3.reason === 'assignee_required');
const badAssign = await rpc(U.modSab, `public.assign_request($1, $2)`, [inc.id, U.beto]);
ok('E8 no se puede asignar a alguien que no es personal', badAssign.reason === 'assignee_not_staff');
await rpc(U.modSab, `public.assign_request($1, $2)`, [inc.id, U.modSab]);
const s4 = await rpc(U.modSab, `public.change_request_status($1, 'approved', 'in_progress')`, [inc.id]);
const s4b = await rpc(U.modSab, `public.change_request_status($1, 'approved', 'in_progress')`, [inc.id]);
ok('E9 compare-and-set en consultas: repetir la misma transición → stale_state', s4.status === 'ok' && s4b.reason === 'stale_state');
const s5 = await rpc(U.modSab, `public.change_request_status($1, 'in_progress', 'resolved')`, [inc.id]);
const s6 = await rpc(U.modSab, `public.change_request_status($1, 'in_progress', 'resolved', 'Se cambió la bombilla.')`, [inc.id]);
ok('E10 resolver exige nota', s5.reason === 'note_required' && s6.status === 'ok');
const hist = await as(db, U.ana, `select to_status from public.request_status_history where request_id = $1 order by created_at, id`, [inc.id]);
ok('E11 historial completo visible para la autora', hist.rows.map(r => r.to_status).join('>') === 'pending>under_review>approved>in_progress>resolved',
   hist.rows.map(r => r.to_status).join('>'));
ok('E12 la autora recibió notificaciones de cada cambio',
   (await one(`select count(*)::int n from public.notifications where user_id = $1 and kind = 'request_status'`, [U.ana])).n >= 4);

// ---------------------------------------------------------------------------------------------
// F. Votación de prioridades (F5 "voten prioridades")
// ---------------------------------------------------------------------------------------------
const pub = await rpc(U.ana, `public.create_citizen_request('incident', 'infraestructura', 'Acera rota', 'La acera frente a la escuela está rota.', 'ana-req-00005', $1, $2)`, P.SAB);
const v0 = await rpc(U.beto, `public.toggle_request_vote($1)`, [pub.id]);
ok('F1 no se vota una solicitud no pública', v0.reason === 'not_votable');
await rpc(U.modSab, `public.change_request_status($1, 'pending', 'under_review')`, [pub.id]);
await rpc(U.modSab, `public.change_request_status($1, 'under_review', 'approved')`, [pub.id]);
const pubOk = await rpc(U.modSab, `public.set_request_public($1, true)`, [pub.id]);
const v1 = await rpc(U.beto, `public.toggle_request_vote($1)`, [pub.id]);
const v2 = await rpc(U.beto, `public.toggle_request_vote($1)`, [pub.id]);
const v3 = await rpc(U.beto, `public.toggle_request_vote($1)`, [pub.id]);
const v4 = await rpc(U.cris, `public.toggle_request_vote($1)`, [pub.id]);
ok('F2 un voto por usuario; alternar quita y pone; el contador lo lleva la base',
   pubOk.status === 'ok' && v1.voted && v1.support_count === 1 && !v2.voted && v2.support_count === 0
   && v3.support_count === 1 && v4.support_count === 2, JSON.stringify([v1, v2, v3, v4]));
const own = await rpc(U.ana, `public.toggle_request_vote($1)`, [pub.id]);
ok('F3 la autora no vota su propia solicitud', own.reason === 'own_request');
await expectError('F4 no se insertan votos directamente', () => as(db, U.cris,
  `insert into public.request_votes (request_id, user_id) values ($1, $2)`, [pub.id, U.cris]), /permission denied/);
const anonPub = await as(db, null, `select title, support_count from public.citizen_requests where id = $1`, [pub.id]);
ok('F5 anon ve la solicitud pública con sus apoyos', anonPub.rows[0]?.support_count === 2);
await expectError('F6 anon no ve quién la creó', () => as(db, null, `select requester_id from public.citizen_requests`), /permission denied/);

// ---------------------------------------------------------------------------------------------
// G. Negocios, horarios, lugares y rutas (F1, F2, F3)
// ---------------------------------------------------------------------------------------------
const biz = await rpc(U.cris, `public.submit_business('Café Monción', 'cafeteria', $1, $2, 'cris-biz-000001', 'Café de altura')`, P.MON);
ok('G1 alta de negocio pendiente con dueño', biz.status === 'ok' && biz.business_status === 'pending'
   && (await one(`select member_role from public.business_members where business_id = $1 and user_id = $2`, [biz.id, U.cris])).member_role === 'owner');
ok('G2 anon no ve negocios pendientes; el dueño sí',
   (await as(db, null, `select id from public.businesses where id = $1`, [biz.id])).rows.length === 0
   && (await as(db, U.cris, `select id from public.businesses where id = $1`, [biz.id])).rows.length === 1);
const rWrong = await rpc(U.modSab, `public.review_content('business', $1, 'pending', 'under_review')`, [biz.id]);
ok('G3 moderador de otro municipio no revisa (forbidden)', rWrong.reason === 'forbidden');
await rpc(U.modMon, `public.review_content('business', $1, 'pending', 'under_review')`, [biz.id]);
const appr = await rpc(U.modMon, `public.review_content('business', $1, 'under_review', 'approved')`, [biz.id]);
ok('G4 aprobado: el dueño pasa a entrepreneur y el negocio es público', appr.status === 'ok'
   && (await one(`select count(*)::int n from public.user_roles where user_id = $1 and role = 'entrepreneur'`, [U.cris])).n === 1
   && (await as(db, null, `select id from public.businesses where id = $1`, [biz.id])).rows.length === 1);
const mass = await rpc(U.cris, `public.update_business($1, 1, '{"status":"approved","name":"X"}'::jsonb)`, [biz.id]);
ok('G5 asignación masiva bloqueada (campo no permitido)', mass.reason === 'unknown_field', JSON.stringify(mass));
const curVersion = (await one(`select version from public.businesses where id = $1`, [biz.id])).version;
const upd = await rpc(U.cris, `public.update_business($1, $2, '{"phone":"+1 809 555 0101"}'::jsonb)`, [biz.id, curVersion]);
const conflict = await rpc(U.cris, `public.update_business($1, $2, '{"phone":"+1 809 555 0199"}'::jsonb)`, [biz.id, curVersion]);
ok('G6 bloqueo optimista: versión vieja → version_conflict', upd.status === 'ok' && conflict.reason === 'version_conflict', JSON.stringify(conflict));
const other = await rpc(U.beto, `public.update_business($1, $2, '{"phone":"+1 809 000 0000"}'::jsonb)`, [biz.id, curVersion + 1]);
ok('G7 otro usuario no edita el negocio', other.reason === 'forbidden');
const badPhone = await rpc(U.cris, `public.update_business($1, $2, '{"phone":"<script>"}'::jsonb)`, [biz.id, curVersion + 1]);
ok('G8 datos inválidos rechazados por CHECK (no se guardan)', badPhone.reason === 'invalid_field');
const hoursBad = await rpc(U.cris, `public.set_business_hours($1, '[{"weekday":9,"opens":"08:00","closes":"17:00"}]'::jsonb)`, [biz.id]);
const hoursOk = await rpc(U.cris, `public.set_business_hours($1, '[{"weekday":1,"opens":"08:00","closes":"17:00"},{"weekday":6,"opens":"20:00","closes":"02:00"}]'::jsonb)`, [biz.id]);
ok('G9 horarios validados; anon los ve en negocios aprobados', hoursBad.reason === 'invalid_hours' && hoursOk.status === 'ok'
   && (await as(db, null, `select count(*)::int n from public.business_hours where business_id = $1`, [biz.id])).rows[0].n === 2);

const place = await rpc(U.beto, `public.propose_place('Mirador de Monción', 'mirador', $1, $2, 'Vista al embalse')`, P.MON);
ok('G10 propuesta ciudadana de lugar queda pendiente e invisible al público', place.place_status === 'pending'
   && (await as(db, null, `select id from public.tourism_places where id = $1`, [place.id])).rows.length === 0);
await rpc(U.modMon, `public.review_content('place', $1, 'pending', 'published')`, [place.id]);
const found = await as(db, null, `select entity, name from public.search_all('mirador moncion')`);
ok('G11 publicada y encontrable sin acentos ("moncion" → "Monción")', found.rows.some(r => r.name === 'Mirador de Monción'),
   JSON.stringify(found.rows));
const typo = await as(db, null, `select name from public.search_all('Cafe Monsion')`);
ok('G12 búsqueda tolera errores de tipeo (trigramas)', typo.rows.some(r => r.name === 'Café Monción'), JSON.stringify(typo.rows));

const line = { type: 'LineString', coordinates: [[-71.3412, 19.4752], [-71.3450, 19.4700], [-71.3500, 19.4668]] };
const route = await rpc(U.beto, `public.propose_route('Sendero del Inaje', 'ecologica', 'media', 90, $1::jsonb)`, [JSON.stringify(line)]);
const rrow = await one(`select distance_km, st_astext(start_point) sp, municipality_ids from public.eco_routes where id = $1`, [route.id]);
ok('G13 ruta: distancia y punto de inicio calculados por la base', route.status === 'ok' && Number(rrow.distance_km) > 0.5
   && Number(rrow.distance_km) < 2 && rrow.sp.startsWith('POINT(-71.3412') && rrow.municipality_ids.includes(muni.SAB),
   JSON.stringify(rrow));
const badRoute = await rpc(U.beto, `public.propose_route('Mala', 'ecologica', 'baja', 30, '{"type":"Point","coordinates":[0,0]}'::jsonb)`);
ok('G14 geometría inválida rechazada', badRoute.reason === 'invalid_geometry');

// ---------------------------------------------------------------------------------------------
// H. Roles (ADR-020: sin super_admin)
// ---------------------------------------------------------------------------------------------
const g1 = await rpc(U.admMon, `public.assign_role($1, 'moderator', $2)`, [U.beto, muni.MON]);
const g2 = await rpc(U.admMon, `public.assign_role($1, 'moderator', $2)`, [U.beto, muni.SAB]);
const g3 = await rpc(U.admMon, `public.assign_role($1, 'municipal_admin', $2)`, [U.beto, muni.MON]);
const g4 = await rpc(U.admProv, `public.assign_role($1, 'municipal_admin', $2)`, [U.beto, muni.VLA]);
const g5 = await rpc(U.admProv, `public.assign_role($1, 'municipal_admin', null)`, [U.beto]);
const g6 = await rpc(U.ana, `public.assign_role($1, 'moderator', $2)`, [U.ana, muni.SAB]);
ok('H1 admin municipal asigna moderadores solo en su municipio', g1.status === 'ok' && g2.reason === 'forbidden');
ok('H2 solo el admin provincial crea admins municipales', g3.reason === 'forbidden' && g4.status === 'ok');
ok('H3 el alcance provincial no se asigna desde la app', g5.reason === 'provincial_scope_requires_operation_script');
ok('H4 un ciudadano no se autoasigna roles', g6.reason === 'forbidden');

// ---------------------------------------------------------------------------------------------
// I. KPIs y PDF (misma fuente)
// ---------------------------------------------------------------------------------------------
const today = (await one(`select (now() at time zone 'America/Santo_Domingo')::date d`)).d;
const iso = d => (d instanceof Date ? d.toISOString() : String(d)).slice(0, 10);
const kCit = await rpc(U.ana, `public.kpi_summary($1::date, $1::date)`, [iso(today)]);
const kMonOnSab = await rpc(U.admMon, `public.kpi_summary($1::date, $1::date, $2)`, [iso(today), muni.SAB]);
const kProv = await rpc(U.admProv, `public.kpi_summary($1::date, $1::date)`, [iso(today)]);
ok('I1 KPIs: ciudadano y admin de otro municipio → forbidden', kCit.reason === 'forbidden' && kMonOnSab.reason === 'forbidden');
ok('I2 KPIs provinciales cuentan lo ocurrido hoy (2 tránsito válidos, 4 solicitudes, 1 resuelta, 1 negocio)', kProv.traffic.received === 2 && kProv.traffic.out_of_area === 1 && kProv.requests.received === 4
   && kProv.requests.resolved === 1 && kProv.businesses.approved_total === 1, JSON.stringify({t: kProv.traffic, r: kProv.requests, b: kProv.businesses}));
const periodStart = iso((await one(`select date_trunc('week', (now() at time zone 'America/Santo_Domingo')::date)::date d`)).d);
const wr1 = await rpc('service', `public.weekly_report_begin($1::date)`, [periodStart]);
const wr2 = await rpc('service', `public.weekly_report_begin($1::date)`, [periodStart]);
ok('I3 informe semanal: 4 snapshots (provincia + 3 municipios); el cron repetido no duplica',
   wr1.status === 'ok' && wr1.snapshots.length === 4 && wr2.status === 'skipped', JSON.stringify(wr2));
const kWeek = await rpc('service', `public.kpi_summary($1::date, ($1::date + 6))`, [periodStart]);
const snapProv = await one(`select metrics from public.weekly_kpi_snapshots where report_run_id = $1 and municipality_id is null`, [wr1.run_id]);
ok('I4 PDF y panel coinciden: snapshot == kpi_summary del mismo periodo',
   JSON.stringify(snapProv.metrics) === JSON.stringify(kWeek));
const wrMan = await rpc(U.admProv, `public.weekly_report_begin($1::date, true)`, [periodStart]);
const wrMun = await rpc(U.admMon, `public.weekly_report_begin($1::date, true)`, [periodStart]);
ok('I5 regeneración manual crea versión 2 (solo admin provincial)', wrMan.version === 2 && wrMun.reason === 'forbidden');
const fin = await rpc('service', `public.weekly_report_finish($1, true, 'sr/2026/semana-39/v1.pdf')`, [wr1.run_id]);
ok('I6 cierre del informe y aviso a administradores', fin.status === 'ok'
   && (await one(`select count(*)::int n from public.notifications where kind = 'system'`)).n >= 2);

// ---------------------------------------------------------------------------------------------
// J. Cola de trabajos
// ---------------------------------------------------------------------------------------------
await expectError('J1 un usuario no puede tomar trabajos del worker',
  () => rpc(U.admProv, `public.worker_claim_jobs(5)`), /permission denied|forbidden/);
const claimed = await rpc('service', `public.worker_claim_jobs(50)`);
const again = await rpc('service', `public.worker_claim_jobs(50)`);
ok('J2 el worker toma trabajos y no los repite mientras están tomados', claimed.length > 0 && again.length === 0,
   `${claimed.length} / ${again.length}`);
await rpc('service', `public.worker_finish_job($1, false, 'SMTP caído')`, [claimed[0].id]);
const retry = await one(`select status, run_at > now() + interval '20 seconds' later from private.jobs where id = $1`, [claimed[0].id]);
ok('J3 fallo → reintento con backoff', retry.status === 'pending' && retry.later === true);
await db.exec(`select private.enqueue('push', '{"x":1}', 'dedupe-test'); select private.enqueue('push', '{"x":2}', 'dedupe-test');`);
ok('J4 deduplicación de trabajos pendientes',
   (await one(`select count(*)::int n from private.jobs where dedupe_key = 'dedupe-test'`)).n === 1);

// ---------------------------------------------------------------------------------------------
// K. Storage
// ---------------------------------------------------------------------------------------------
await as(db, U.ana, `insert into storage.objects (bucket_id, name) values ('report-evidence', $1)`, [`incoming/${U.ana}/foto.jpg`]);
ok('K1 ciudadana sube a su carpeta incoming/{uid}', true);
await expectError('K2 no puede subir a la carpeta de otro usuario',
  () => as(db, U.ana, `insert into storage.objects (bucket_id, name) values ('report-evidence', $1)`, [`incoming/${U.beto}/x.jpg`]),
  /row-level security/);
await expectError('K3 no puede escribir en el bucket público',
  () => as(db, U.ana, `insert into storage.objects (bucket_id, name) values ('public-media', 'x/y.webp')`), /row-level security/);

// ---------------------------------------------------------------------------------------------
// M. Fotos (F2), alertas sobre el mapa, edición de lugares y rutas (F3), agregados, salud y baja de cuenta
// ---------------------------------------------------------------------------------------------
const upload = (who, name, meta = { mimetype: 'image/jpeg', size: 120000 }) =>
  as(db, who, `insert into storage.objects (bucket_id, name, metadata) values ('report-evidence', $1, $2::jsonb)`, [name, JSON.stringify(meta)]);
const tc = await createTraffic(U.cris, P.MON, 'cris-traffic-0001', 'accidente');
const p1 = `incoming/${U.cris}/foto-0001.jpg`;
await upload(U.cris, p1);
const a1 = await rpc(U.cris, `public.register_attachment('traffic_report', $1, $2)`, [tc.id, p1]);
ok('M1 foto subida a su carpeta y registrada en su reporte (encolada para procesar)', a1.status === 'ok'
   && (await one(`select count(*)::int n from private.jobs where kind = 'image_process' and payload->>'attachment_id' = $1`, [a1.id])).n === 1,
   JSON.stringify(a1));
await upload(U.beto, `incoming/${U.beto}/foto-0002.jpg`);
const aForeign = await rpc(U.beto, `public.register_attachment('traffic_report', $1, $2)`, [tc.id, `incoming/${U.beto}/foto-0002.jpg`]);
const aPath = await rpc(U.cris, `public.register_attachment('traffic_report', $1, $2)`, [tc.id, `incoming/${U.beto}/foto-0002.jpg`]);
const aMissing = await rpc(U.cris, `public.register_attachment('traffic_report', $1, $2)`, [tc.id, `incoming/${U.cris}/no-existe.jpg`]);
ok('M2 no se registra en reporte ajeno, con archivo de otro ni sin archivo subido',
   aForeign.reason === 'forbidden' && aPath.reason === 'invalid_path' && aMissing.reason === 'upload_not_found',
   [aForeign.reason, aPath.reason, aMissing.reason].join(','));
await upload(U.cris, `incoming/${U.cris}/foto-0003.jpg`, { mimetype: 'application/pdf', size: 1000 });
const aPdf = await rpc(U.cris, `public.register_attachment('traffic_report', $1, $2)`, [tc.id, `incoming/${U.cris}/foto-0003.jpg`]);
ok('M3 tipo de archivo no permitido → invalid_file (no se confía en la extensión)', aPdf.reason === 'invalid_file');
const regs = [];
for (const n of ['0004', '0005', '0006']) {
  await upload(U.cris, `incoming/${U.cris}/foto-${n}.jpg`);
  regs.push(await rpc(U.cris, `public.register_attachment('traffic_report', $1, $2)`, [tc.id, `incoming/${U.cris}/foto-${n}.jpg`]));
}
ok('M4 máximo 3 fotos por reporte', regs[0].status === 'ok' && regs[1].status === 'ok' && regs[2].reason === 'too_many_photos',
   regs.map(r => r.status + ':' + (r.reason ?? '')).join(','));
await expectError('M5 el worker es el único que marca fotos procesadas',
  () => rpc(U.cris, `public.worker_attachment_processed($1, true, 'x/y.webp', 1000, 800, 600)`, [a1.id]), /permission denied|forbidden/);
const proc = await rpc('service', `public.worker_attachment_processed($1, true, $2, 90000, 1600, 1200)`, [a1.id, `processed/${a1.id}.webp`]);
const a1row = await one(`select status, mime, path from public.attachments where id = $1`, [a1.id]);
ok('M6 procesada: WebP limpio y borrado del original (con EXIF) encolado', proc.status === 'ok' && a1row.status === 'processed'
   && a1row.mime === 'image/webp' && (await one(`select count(*)::int n from private.jobs where dedupe_key = $1`, ['del:' + p1])).n === 1);
const evPub = await rpc(U.modMon, `public.review_content('attachment', $1, 'processed', 'approved')`, [a1.id]);
ok('M7 la evidencia de un reporte nunca se publica', evPub.reason === 'not_publishable', JSON.stringify(evPub));

const pBiz = `incoming/${U.cris}/foto-0007.jpg`;
await upload(U.cris, pBiz);
const aBiz = await rpc(U.cris, `public.register_attachment('business', $1, $2)`, [biz.id, pBiz]);
await rpc('service', `public.worker_attachment_processed($1, true, $2, 80000, 1200, 900)`, [aBiz.id, `processed/${aBiz.id}.webp`]);
const anonBefore = (await as(db, null, `select id from public.attachments where id = $1`, [aBiz.id])).rows.length;
const apr = await rpc(U.modMon, `public.review_content('attachment', $1, 'processed', 'approved')`, [aBiz.id]);
await rpc('service', `public.worker_attachment_published($1)`, [aBiz.id]);
const anonAfter = (await as(db, null, `select bucket from public.attachments where id = $1`, [aBiz.id])).rows;
ok('M8 foto de negocio: moderada, publicada en public-media y visible al público solo después',
   aBiz.status === 'ok' && apr.status === 'ok' && anonBefore === 0 && anonAfter[0]?.bucket === 'public-media',
   JSON.stringify({ aBiz, apr, anonBefore, anonAfter }));

let uploaded = (await one(`select count(*)::int n from storage.objects where name like $1`, [`incoming/${U.cris}/%`])).n;
for (let i = 100; uploaded < 20; i++, uploaded++) await upload(U.cris, `incoming/${U.cris}/lote-${i}.jpg`);
await expectError('M9 cuota de Storage: la subida 21 de la hora se bloquea',
  () => upload(U.cris, `incoming/${U.cris}/exceso.jpg`), /row-level security/);

// Alertas sobre el mapa
await db.query(`update public.profiles set home_municipality_id = $2 where id = $1`, [U.beto, muni.MON]);
await db.query(`update public.profiles set home_municipality_id = $2 where id = $1`, [U.admMon, muni.MON]);
await db.query(`insert into public.notification_preferences (user_id, topics) values ($1, array['request_status'])`, [U.admMon]);
await rpc(U.modMon, `public.moderate_traffic_report($1, 'pending', 'active')`, [tc.id]);
const alertJobs = async () => (await one(`select count(*)::int n from private.jobs where kind = 'fanout_alert' and payload->>'traffic_report_id' = $1`, [tc.id])).n;
const jobs1 = await alertJobs();
const sentTo = await rpc('service', `public.worker_run_fanout_alert($1)`, [tc.id]);
const betoAlert = (await one(`select count(*)::int n from public.notifications where user_id = $1 and kind = 'traffic_nearby'`, [U.beto])).n;
const admAlert = (await one(`select count(*)::int n from public.notifications where user_id = $1 and kind = 'traffic_nearby'`, [U.admMon])).n;
const crisAlert = (await one(`select count(*)::int n from public.notifications where user_id = $1 and kind = 'traffic_nearby'`, [U.cris])).n;
ok('M10 alerta sobre el mapa: vecinos del municipio avisados; autor y quien se dio de baja, no',
   jobs1 === 1 && sentTo === 1 && betoAlert === 1 && admAlert === 0 && crisAlert === 0,
   JSON.stringify({ jobs1, sentTo, betoAlert, admAlert, crisAlert }));
await rpc(U.modMon, `public.moderate_traffic_report($1, 'active', 'verified')`, [tc.id]);
ok('M11 una sola alerta por reporte (verificarlo no la repite)', await alertJobs() === 1);

// Edición de lugares y rutas (F3: servicios)
const pl = await one(`select id, version from public.tourism_places where id = $1`, [place.id]);
const upOwnPublished = await rpc(U.ana,   // Beto ya es moderador de Monción (H1): se prueba con alguien sin rol
                                   `public.update_place($1, $2, '{"description":"cambio"}'::jsonb)`, [pl.id, pl.version]);
const upStaff = await rpc(U.modMon, `public.update_place($1, $2, '{"services":{"parqueo":true,"banos":true,"guia":"fines de semana"}}'::jsonb)`, [pl.id, pl.version]);
const upStale = await rpc(U.modMon, `public.update_place($1, $2, '{"description":"otra"}'::jsonb)`, [pl.id, pl.version]);
const upMass = await rpc(U.modMon, `public.update_place($1, $2, '{"status":"archived"}'::jsonb)`, [pl.id, pl.version + 1]);
const upBadSvc = await rpc(U.modMon, `public.update_place($1, $2, '{"services":{"parqueo":{"x":1}}}'::jsonb)`, [pl.id, pl.version + 1]);
ok('M12 lugares: el personal edita servicios; versión, lista blanca y formato validados; un ciudadano no edita',
   upOwnPublished.reason === 'forbidden' && upStaff.status === 'ok' && upStale.reason === 'version_conflict'
   && upMass.reason === 'unknown_field' && upBadSvc.reason === 'invalid_services',
   [upOwnPublished.reason, upStaff.status, upStale.reason, upMass.reason, upBadSvc.reason].join(','));
const rt = await one(`select id, version, distance_km from public.eco_routes where id = $1`, [route.id]);
const rtOwn = await rpc(U.beto, `public.update_route($1, $2, '{"services":{"agua":true}}'::jsonb)`, [rt.id, rt.version]);
const longer = { type: 'LineString', coordinates: [[-71.3412, 19.4752], [-71.3450, 19.4700], [-71.3500, 19.4668], [-71.3600, 19.4600]] };
const rtGeoOwn = await rpc(U.beto, `public.update_route($1, $2, jsonb_build_object('geojson', $3::jsonb))`, [rt.id, rt.version + 1, JSON.stringify(longer)]);
const rtGeoStaff = await rpc(U.modSab, `public.update_route($1, $2, jsonb_build_object('geojson', $3::jsonb))`, [rt.id, rt.version + 1, JSON.stringify(longer)]);
const rtAfter = await one(`select distance_km, services from public.eco_routes where id = $1`, [rt.id]);
ok('M13 rutas: el autor completa servicios mientras está pendiente; solo el personal cambia el trazado y la distancia se recalcula',
   rtOwn.status === 'ok' && rtGeoOwn.reason === 'forbidden' && rtGeoStaff.status === 'ok'
   && Number(rtAfter.distance_km) > Number(rt.distance_km) && rtAfter.services.agua === true,
   JSON.stringify({ rtOwn, rtGeoOwn, rtGeoStaff, before: rt.distance_km, after: rtAfter.distance_km }));

// Agregados, salud
const agg = await rpc(null, `public.map_aggregates()`);
const mon = agg.find(a => a.municipality_id === muni.MON);
ok('M14 mapa provincial: conteos públicos por municipio (anon)', agg.length === 3 && mon.businesses === 1 && mon.tourism === 1
   && mon.traffic === 1, JSON.stringify(mon));
await expectError('M15 la salud de la cola solo la consulta el servidor',
  () => rpc(U.admProv, `public.worker_queue_health()`), /permission denied|forbidden/);
const health = await rpc('service', `public.worker_queue_health()`);
ok('M16 salud de la cola: pendientes, antigüedad y muertos', typeof health.pending === 'number' && 'oldest_pending_seconds' in health);

// Métricas del comercio
await as(db, null, `select public.track_engagement('business', $1, 'view')`, [biz.id]);
await as(db, null, `select public.track_engagement('business', $1, 'view')`, [biz.id]);
await as(db, U.beto, `select public.track_engagement('business', $1, 'whatsapp')`, [biz.id]);
await as(db, null, `select public.track_engagement('business', $1, 'view')`, ['00000000-0000-0000-0000-000000000000']);
const eng = await q(`select metric, count from public.engagement_daily where entity_id = $1 order by metric`, [biz.id]);
ok('M17a métricas del comercio: agregadas por día; ignora entidades inexistentes',
   eng.length === 2 && eng[0].metric === 'view' && eng[0].count === 2 && eng[1].count === 1
   && (await one(`select count(*)::int n from public.engagement_daily`)).n === 2, JSON.stringify(eng));

// S. Promociones con la fecha de República Dominicana (migración 290), no la UTC
const rdToday = (await one(`select private.local_today()::text d, ((now() at time zone 'America/Santo_Domingo')::date)::text e`));
ok('S1 "hoy" es la fecha de Santo Domingo', rdToday.d === rdToday.e, JSON.stringify(rdToday));
const pToday = await rpc(U.cris, `public.create_promotion($1, 'Empieza hoy', private.local_today(), private.local_today() + 3)`, [biz.id]);
const pYesterday = await rpc(U.cris, `public.create_promotion($1, 'Empezó ayer', private.local_today() - 1, private.local_today() + 3)`, [biz.id]);
ok('S2 se acepta una promoción que empieza hoy (hora de RD) y se rechaza una de ayer',
   pToday.status === 'ok' && pYesterday.reason === 'invalid_dates', JSON.stringify([pToday, pYesterday]));
const pTomorrow = await rpc(U.cris, `public.create_promotion($1, 'Empieza mañana', private.local_today() + 1, private.local_today() + 3)`, [biz.id]);
for (const p of [pToday, pTomorrow]) await rpc(U.modMon, `public.review_content('promotion', $1, 'pending', 'active')`, [p.id]);
const anonSees = async (id) => (await as(db, null, `select id from public.promotions where id = $1`, [id])).rows.length === 1;
ok('S3 el público ve la promoción vigente hoy y todavía no la de mañana', (await anonSees(pToday.id)) && !(await anonSees(pTomorrow.id)));

// Promociones y suspensión
const promo = await rpc(U.cris, `public.create_promotion($1, '2x1 en café', private.local_today(), private.local_today() + 10)`, [biz.id]);
await rpc(U.modMon, `public.review_content('promotion', $1, 'pending', 'active')`, [promo.id]);
const anonPromo = (await as(db, null, `select id from public.promotions where id = $1`, [promo.id])).rows.length;
await rpc(U.modMon, `public.review_content('business', $1, 'approved', 'suspended', 'Datos de contacto falsos')`, [biz.id]);
const promoAfter = (await one(`select status from public.promotions where id = $1`, [promo.id])).status;
ok('M17 suspender un negocio pausa sus promociones', anonPromo === 1 && promoAfter === 'paused', `${anonPromo} ${promoAfter}`);

// Baja de cuenta
await expectError('M18 no se puede dar de baja al único dueño de un negocio activo',
  () => db.query(`delete from auth.users where id = $1`, [U.cris]), /transfer_ownership_first/);
await rpc(U.modMon, `public.review_content('business', $1, 'suspended', 'archived')`, [biz.id]);
await db.query(`delete from auth.users where id = $1`, [U.cris]);
const crisGone = await one(`select
  (select count(*) from public.profiles where id = $1)::int as profile,
  (select count(*) from public.attachments where traffic_report_id = $2 and status <> 'rejected')::int as live_evidence,
  (select count(*) from private.jobs where kind = 'delete_storage_object')::int as deletions`, [U.cris, tc.id]);
ok('M19 tras archivar el negocio, la baja procede, se audita y la evidencia privada se elimina',
   crisGone.profile === 0 && crisGone.live_evidence === 0 && crisGone.deletions >= 3
   && (await one(`select count(*)::int n from public.audit_logs where action = 'account.delete' and entity_id = $1`, [U.cris])).n === 1,
   JSON.stringify(crisGone));

// ---------------------------------------------------------------------------------------------
// N. Descarga auditada del informe semanal (la auditoría es condición de lectura en Storage)
// ---------------------------------------------------------------------------------------------
lastStep = 'N';
const pdfPath = 'sr/2026/semana-39/v1.pdf';
await db.query(`insert into storage.objects (bucket_id, name) values ('reports-pdf', $1)`, [pdfPath]);
const canRead = async who => (await as(db, who, `select count(*)::int n from storage.objects where bucket_id = 'reports-pdf' and name = $1`, [pdfPath])).rows[0].n === 1;
const dlCit = await rpc(U.ana, `public.authorize_report_download($1)`, [wr1.run_id]);
const dlMod = await rpc(U.modSab, `public.authorize_report_download($1)`, [wr1.run_id]);
const deniedLogged = (await one(`select count(*)::int n from public.audit_logs where action = 'report.download' and result = 'denied' and entity_id = $1`, [wr1.run_id])).n;
ok('N1 ciudadano y moderador no descargan el PDF; el intento queda auditado',
   dlCit.reason === 'forbidden' && dlMod.reason === 'forbidden' && deniedLogged === 2, JSON.stringify({ dlCit, dlMod, deniedLogged }));
ok('N2 sin registrar la descarga, ni un administrador puede leer el PDF en Storage', !(await canRead(U.admMon)));
const dlMon = await rpc(U.admMon, `public.authorize_report_download($1)`, [wr1.run_id]);
ok('N3 admin municipal registra la descarga y entonces puede leer el PDF',
   dlMon.status === 'ok' && dlMon.path === pdfPath && await canRead(U.admMon), JSON.stringify(dlMon));
ok('N4 la autorización es personal: otro administrador no la hereda', !(await canRead(U.admProv)));
await db.query(`update public.audit_logs set created_at = now() - interval '10 minutes' where action = 'report.download' and actor_id = $1`, [U.admMon]);
ok('N5 la autorización vence a los 5 minutos', !(await canRead(U.admMon)));
const dlRunning = await rpc(U.admProv, `public.authorize_report_download($1)`, [wrMan.run_id]);
ok('N6 un informe que no terminó no se descarga', dlRunning.reason === 'not_ready', JSON.stringify(dlRunning));

// ---------------------------------------------------------------------------------------------
// O. Responsables y directorio del personal (solo el personal del municipio los ve)
// ---------------------------------------------------------------------------------------------
lastStep = 'O';
const asg = async (who) => (await as(db, who, `select * from public.request_assignees($1::uuid[])`, [[inc.id]])).rows;
const asgSab = await asg(U.modSab);
ok('O1 el personal del municipio ve quién atiende cada consulta', asgSab.length === 1 && asgSab[0].assignee_id === U.modSab && asgSab[0].assignee_name === 'Moderador Sabaneta', JSON.stringify(asgSab));
ok('O2 personal de otro municipio y ciudadanos no ven al responsable', (await asg(U.modMon)).length === 0 && (await asg(U.cris)).length === 0);
const dir = async (who) => (await as(db, who, `select * from public.staff_directory($1)`, [muni.SAB])).rows.map((r) => r.user_id);
const dirSab = await dir(U.modSab);
ok('O3 directorio del personal: incluye moderadores del municipio y administración provincial, no de otros municipios',
   dirSab.includes(U.modSab) && dirSab.includes(U.admProv) && !dirSab.includes(U.modMon) && (await dir(U.cris)).length === 0, JSON.stringify(dirSab));
ok('O4 anon no puede ejecutar las funciones del personal',
   !(await one(`select has_function_privilege('anon', 'public.staff_directory(uuid)', 'execute') a`)).a
   && !(await one(`select has_function_privilege('anon', 'public.request_assignees(uuid[])', 'execute') a`)).a);

// ---------------------------------------------------------------------------------------------
// P. Entrega del worker: aviso al personal (notify_moderators) y Web Push
// ---------------------------------------------------------------------------------------------
const staffNotified = async (entityId) => (await q(`select user_id from public.notifications
   where payload->>'id' = $1 and payload->>'staff' = 'true'`, [entityId])).map((r) => r.user_id);
const reqMon = await rpc(U.beto, `public.create_citizen_request('inquiry', 'consulta', 'Permiso de construcción', 'Quisiera saber qué papeles piden para construir.', 'beto-req-00101', null, null, $1)`, [muni.MON]);
await expectError('P1 un usuario no puede disparar avisos del worker',
  () => rpc(U.admProv, `public.worker_notify_moderators('citizen_request', $1)`, [reqMon.id]), /permission denied|forbidden/);
const nMon = await rpc('service', `public.worker_notify_moderators('citizen_request', $1)`, [reqMon.id]);
const toMon = await staffNotified(reqMon.id);
// beto es moderador de Monción (sección H) y autor de la consulta: no se avisa a sí mismo
ok('P2 la consulta avisa a los moderadores de su municipio, no a otros, ni a la administración, ni al autor',
   nMon === 1 && toMon.length === 1 && toMon[0] === U.modMon, JSON.stringify(toMon));
await db.query(`delete from private.rate_limit_hits where user_id = $1`, [U.ana]);   // Ana agotó su cupo en E y F
const reqVla = await rpc(U.ana, `public.create_citizen_request('inquiry', 'consulta', 'Horario del cementerio', 'Quisiera saber a qué hora abre el cementerio.', 'ana-req-00102', null, null, $1)`, [muni.VLA]);
await rpc('service', `public.worker_notify_moderators('citizen_request', $1)`, [reqVla.id]);
const toVla = await staffNotified(reqVla.id);
// Villa Los Almácigos no tiene moderadores: avisa a su admin municipal (beto, sección H) y a la provincial
ok('P3 sin moderadores en el municipio avisa a la administración con alcance, no a la de otros municipios',
   toVla.length === 2 && toVla.includes(U.beto) && toVla.includes(U.admProv), JSON.stringify(toVla));
ok('P4 entidad desconocida o ya revisada: no avisa a nadie',
   (await rpc('service', `public.worker_notify_moderators('otra', $1)`, [reqVla.id])) === 0);

await db.query(`insert into public.notification_preferences (user_id, push_enabled, topics) values ($1, true, array['request_status'])
                on conflict (user_id) do update set push_enabled = true, topics = array['request_status']`, [U.modMon]);
await as(db, U.modMon, `insert into public.push_subscriptions (user_id, endpoint, p256dh, auth) values ($1, 'https://push.example.com/a', 'k', 'a'),
                                                                                                      ($1, 'https://push.example.com/b', 'k', 'a')`, [U.modMon]);
const reqMon2 = await rpc(U.beto, `public.create_citizen_request('inquiry', 'consulta', 'Recogida de escombros', 'Quisiera saber cuándo pasan a recoger escombros.', 'beto-req-00103', null, null, $1)`, [muni.MON]);
await rpc('service', `public.worker_notify_moderators('citizen_request', $1)`, [reqMon2.id]);
const pushNotif = await one(`select id, push_status from public.notifications where payload->>'id' = $1 and user_id = $2`, [reqMon2.id, U.modMon]);
const pushJob = await one(`select count(*)::int n from private.jobs where kind = 'push' and payload->>'notification_id' = $1`, [pushNotif.id]);
const payload = await rpc('service', `public.worker_push_payload($1)`, [pushNotif.id]);
ok('P5 push activo: la notificación queda pendiente, con su job y sus dos dispositivos',
   pushNotif.push_status === 'pending' && pushJob.n === 1 && payload.subscriptions.length === 2, JSON.stringify(payload));
await expectError('P6 un usuario no puede leer los dispositivos ni el contenido de un push',
  () => rpc(U.modMon, `public.worker_push_payload($1)`, [pushNotif.id]), /permission denied/);
await rpc('service', `public.worker_push_result($1, true, array['https://push.example.com/a'], array['https://push.example.com/b'])`, [pushNotif.id]);
const subs = await q(`select endpoint, last_success_at from public.push_subscriptions where user_id = $1`, [U.modMon]);
ok('P7 tras el envío: notificación enviada, dispositivo vivo sellado y dispositivo caído eliminado',
   (await one(`select push_status from public.notifications where id = $1`, [pushNotif.id])).push_status === 'sent'
   && subs.length === 1 && subs[0].endpoint === 'https://push.example.com/a' && subs[0].last_success_at !== null, JSON.stringify(subs));
const infoBiz = await rpc('service', `public.worker_attachment_info($1)`, [aBiz.id]);
ok('P9 el worker sabe dónde está cada foto y si puede publicarse',
   infoBiz.bucket === 'public-media' && infoBiz.public === true
   && (await rpc('service', `public.worker_attachment_info($1)`, [a1.id])).public === false, JSON.stringify(infoBiz));
await expectError('P10 un usuario no puede consultar las rutas internas de las fotos',
  () => rpc(U.modSab, `public.worker_attachment_info($1)`, [aBiz.id]), /permission denied/);
ok('P8 un push ya enviado no se vuelve a entregar', (await rpc('service', `public.worker_push_payload($1)`, [pushNotif.id])) === null);

// ---------------------------------------------------------------------------------------------
// Q. Informe semanal: "Generar ahora" por la cola y datos del PDF
// ---------------------------------------------------------------------------------------------
const lastClosed = (await one(`select (date_trunc('week', (now() at time zone 'America/Santo_Domingo')::date)::date - 7)::text d`)).d;
const thisWeek = (await one(`select date_trunc('week', (now() at time zone 'America/Santo_Domingo')::date)::date::text d`)).d;
ok('Q1 solo la administración provincial pide un informe manual',
   (await rpc(U.admMon, `public.request_weekly_report($1)`, [lastClosed])).reason === 'forbidden'
   && (await rpc(U.modSab, `public.request_weekly_report($1)`, [lastClosed])).reason === 'forbidden');
ok('Q2 no se genera una semana que no ha terminado',
   (await rpc(U.admProv, `public.request_weekly_report($1)`, [thisWeek])).reason === 'period_not_closed');
const manual = await rpc(U.admProv, `public.request_weekly_report($1)`, [lastClosed]);
const pdfJob = await one(`select count(*)::int n from private.jobs where kind = 'pdf_weekly' and payload->>'run_id' = $1`, [manual.run_id]);
ok('Q3 el pedido crea una versión nueva y encola el PDF para el worker', manual.status === 'ok' && pdfJob.n === 1, JSON.stringify(manual));
await expectError('Q4 un usuario no lee los datos internos de un informe',
  () => rpc(U.admProv, `public.worker_report_run($1)`, [manual.run_id]), /permission denied/);
const runData = await rpc('service', `public.worker_report_run($1)`, [manual.run_id]);
ok('Q5 el worker recibe periodo, provincia y snapshots con nombres (provincia primero)',
   runData.period_start === lastClosed && runData.province_code === 'sr' && runData.snapshots[0].municipality_id === null
   && runData.snapshots.length > 1 && runData.snapshots.slice(1).every((s) => s.municipality_name)
   && typeof runData.traffic_types === 'object', JSON.stringify(runData).slice(0, 300));
await rpc('service', `public.weekly_report_finish($1, true, $2)`, [manual.run_id, `sr/x/v${manual.version}.pdf`]);
ok('Q6 un informe terminado no se vuelve a renderizar', (await rpc('service', `public.worker_report_run($1)`, [manual.run_id])) === null);

// ---------------------------------------------------------------------------------------------
// R. Dispositivos de push: alta, cambio de cuenta en el mismo navegador y baja
// ---------------------------------------------------------------------------------------------
const EP = 'https://push.example.com/telefono-compartido';
ok('R1 sin sesión no se registra un dispositivo',
   (await rpc(null, `public.register_push_device($1, 'k', 'a')`, [EP]).catch((e) => ({ reason: e.message }))).reason?.match(/not_authenticated|permission denied/));
ok('R2 una suscripción inválida se rechaza',
   (await rpc(U.beto, `public.register_push_device('http://inseguro.example', 'k', 'a')`)).reason === 'invalid_subscription');
await rpc(U.beto, `public.register_push_device($1, 'k', 'a', 'Android')`, [EP]);
const betoPrefs = await one(`select push_enabled from public.notification_preferences where user_id = $1`, [U.beto]);
ok('R3 registrar el dispositivo activa el push de la cuenta', betoPrefs.push_enabled === true);
await rpc(U.admMon, `public.register_push_device($1, 'k2', 'a2', 'Android')`, [EP]);
const owners = await q(`select user_id from public.push_subscriptions where endpoint = $1`, [EP]);
ok('R4 si otra persona entra en el mismo navegador, el dispositivo pasa a su cuenta',
   owners.length === 1 && owners[0].user_id === U.admMon, JSON.stringify(owners));
await rpc(U.beto, `public.unregister_push_device($1)`, [EP]);
ok('R5 nadie puede dar de baja el dispositivo de otro',
   (await one(`select count(*)::int n from public.push_subscriptions where endpoint = $1`, [EP])).n === 1);
await rpc(U.admMon, `public.unregister_push_device($1)`, [EP]);
ok('R6 al quitar el último dispositivo se apaga el push de la cuenta',
   (await one(`select count(*)::int n from public.push_subscriptions where endpoint = $1`, [EP])).n === 0
   && (await one(`select push_enabled from public.notification_preferences where user_id = $1`, [U.admMon])).push_enabled === false);

// ---------------------------------------------------------------------------------------------
// T. Catálogos editables desde el panel (administración provincial)
// ---------------------------------------------------------------------------------------------
ok('T1 solo la administración provincial ve y edita los catálogos',
   (await rpc(U.admMon, `public.catalog_admin_list()`)).reason === 'forbidden'
   && (await rpc(U.modSab, `public.save_catalog_item('traffic_types', 'bache', '{"name":"Hoyo"}')`)).reason === 'forbidden');
const newType = await rpc(U.admProv, `public.save_catalog_item('traffic_types', null, '{"name":"Animal en la vía","icon":"dog","default_severity":2,"default_ttl_hours":4}')`);
const typeRow = await one(`select code, default_ttl::text ttl, active from public.traffic_report_types where code = $1`, [newType.code]);
ok('T2 alta de un tipo de tránsito: código derivado del nombre, duración en horas',
   newType.status === 'ok' && newType.code === 'animal_en_la_via' && typeRow.ttl === '04:00:00' && typeRow.active, JSON.stringify({ newType, typeRow }));
const dupe = await rpc(U.admProv, `public.save_catalog_item('traffic_types', null, '{"name":"Animal en la vía","icon":"dog"}')`);
ok('T3 un nombre repetido recibe otro código, sin chocar', dupe.status === 'ok' && dupe.code !== newType.code && /^[a-z_]{2,30}$/.test(dupe.code), dupe.code);
await rpc(U.admProv, `public.save_catalog_item('traffic_types', $1, '{"active":false}')`, [dupe.code]);
const anonTypes = (await as(db, null, `select code from public.traffic_report_types`)).rows.map((r) => r.code);
const listed = await rpc(U.admProv, `public.catalog_admin_list()`);
ok('T4 lo desactivado desaparece para el público pero la administración lo sigue viendo, con su uso',
   !anonTypes.includes(dupe.code) && anonTypes.includes(newType.code)
   && listed.traffic_types.some((t) => t.code === dupe.code && t.active === false)
   && listed.traffic_types.find((t) => t.code === 'bache').in_use >= 0, JSON.stringify(anonTypes));
const newCat = await rpc(U.admProv, `public.save_catalog_item('request_categories', null, '{"name":"Ruido","icon":"volume","kind":"incident"}')`);
ok('T5 las categorías de reporte piden el tipo al crearlas y no lo cambian después',
   newCat.status === 'ok'
   && (await rpc(U.admProv, `public.save_catalog_item('request_categories', $1, '{"kind":"inquiry"}')`, [newCat.code])).reason === 'not_editable'
   && (await rpc(U.admProv, `public.save_catalog_item('request_categories', null, '{"name":"Sin tipo","icon":"alert"}')`)).reason === 'invalid_type');
ok('T6 campos fuera de la lista blanca y valores inválidos se rechazan',
   (await rpc(U.admProv, `public.save_catalog_item('traffic_types', 'bache', '{"code":"hack"}')`)).reason === 'unknown_field'
   && (await rpc(U.admProv, `public.save_catalog_item('traffic_types', 'bache', '{"default_severity":9}')`)).reason === 'invalid_field'
   && (await rpc(U.admProv, `public.save_catalog_item('traffic_types', 'bache', '{"default_ttl_hours":5000}')`)).reason === 'invalid_field');
const inquiries = await q(`select code from public.request_categories where kind = 'inquiry' and active`);
for (const c of inquiries.slice(1)) await rpc(U.admProv, `public.save_catalog_item('request_categories', $1, '{"active":false}')`, [c.code]);
const lastOne = await rpc(U.admProv, `public.save_catalog_item('request_categories', $1, '{"active":false}')`, [inquiries[0].code]);
ok('T7 no se puede desactivar la última categoría activa de un tipo',
   lastOne.reason === 'last_active' && (await one(`select active from public.request_categories where code = $1`, [inquiries[0].code])).active === true);
for (const c of inquiries.slice(1)) await rpc(U.admProv, `public.save_catalog_item('request_categories', $1, '{"active":true}')`, [c.code]);
const bizCat = await rpc(U.admProv, `public.save_catalog_item('business_categories', null, '{"name":"Peluquería y barbería","icon":"scissors"}')`);
const audits = await one(`select count(*)::int n from public.audit_logs where action in ('catalog.create', 'catalog.update') and actor_id = $1`, [U.admProv]);
ok('T8 categorías de negocio con slug y todo queda en la auditoría',
   bizCat.code === 'peluqueria-y-barberia' && audits.n >= 6, JSON.stringify({ bizCat, audits }));

// ---------------------------------------------------------------------------------------------
// L. Mantenimiento y privacidad
// ---------------------------------------------------------------------------------------------
await db.query(`update public.traffic_reports set expires_at = created_at + interval '1 second' where id = $1`, [t1.id]);
await db.query(`select pg_sleep(1.1)`);
const expired = await one(`select private.expire_traffic_reports() n`);
ok('L1 expiración automática de reportes de tránsito', expired.n >= 1
   && (await one(`select status from public.traffic_reports where id = $1`, [t1.id])).status === 'expired');
ok('L2 un reporte expirado desaparece del mapa público',
   !(await rpc(null, bbox)).features.some(f => f.properties.id === t1.id));
await db.query(`delete from auth.users where id = $1`, [U.ana]);
const afterDel = await one(`select
   (select count(*) from public.profiles where id = $1)::int as profiles,
   (select count(*) from public.traffic_reports where reporter_id is null and id = $2)::int as anon_traffic,
   (select count(*) from public.citizen_requests where requester_id is null and id = $3)::int as anon_request,
   (select count(*) from public.request_status_history where request_id = $3)::int as history`, [U.ana, t1.id, inc.id]);
ok('L3 borrar la cuenta: perfil eliminado, reportes anonimizados, historial intacto',
   afterDel.profiles === 0 && afterDel.anon_traffic === 1 && afterDel.anon_request === 1 && afterDel.history === 5,
   JSON.stringify(afterDel));
const ret = await one(`select private.apply_retention() r`);
ok('L4 la retención se ejecuta sin errores', typeof ret.r === 'object', JSON.stringify(ret.r));

} catch (e) {
  results.push({ name: `ERROR NO CONTROLADO después de "${results.at(-1)?.name ?? lastStep}"`, pass: false,
                 detail: `${e.message}${e.where ? ' | ' + e.where : ''}` });
}
// ---------------------------------------------------------------------------------------------
const failed = results.filter(r => !r.pass);
for (const r of results) console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.name}${r.detail && (!r.pass || r.name.includes('informativo')) ? '  → ' + r.detail : ''}`);
console.log(`\n${results.length - failed.length}/${results.length} pruebas OK · ${files.length} migraciones`);
process.exit(failed.length ? 1 : 0);
