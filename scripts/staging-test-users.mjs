// Usuarios de PRUEBA para staging (nunca en producción). Idempotente.
// Crea tres cuentas con correo confirmado y les da su rol:
//   ciudadano.prueba@example.com  → citizen
//   moderador.prueba@example.com  → moderator de San Ignacio de Sabaneta
//   admin.prueba@example.com      → municipal_admin provincial (el script de operación de ADR-020)
// Con --otp <correo> imprime un código de un solo uso para entrar (sin enviar correo).
// Uso: node --env-file=.env.local scripts/staging-test-users.mjs [--otp correo]
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY (usa --env-file=.env.local)');
if (/prod/i.test(process.env.SUPABASE_ENV ?? '')) throw new Error('Este script es solo para staging');
const admin = createClient(url, key, { auth: { persistSession: false } });

const otpIndex = process.argv.indexOf('--otp');
if (otpIndex > 0) {
  const email = process.argv[otpIndex + 1];
  const { data, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email });
  if (error) throw error;
  console.log(data.properties.email_otp);
} else {
  await createUsers();
}

async function createUsers() {
const USERS = [
  { email: 'ciudadano.prueba@example.com', name: 'Ana Ciudadana (prueba)', role: null, muni: 'SAB' },
  { email: 'moderador.prueba@example.com', name: 'Mario Moderador (prueba)', role: 'moderator', muni: 'SAB' },
  { email: 'admin.prueba@example.com', name: 'Alba Administradora (prueba)', role: 'municipal_admin', muni: null },
];

const { data: province } = await admin.from('provinces').select('id').eq('code', 'SR').single();
const { data: munis } = await admin.from('municipalities').select('id, code');
const muniId = (code) => munis.find((m) => m.code === code)?.id ?? null;

const { data: list } = await admin.auth.admin.listUsers({ perPage: 200 });
for (const u of USERS) {
  let user = list.users.find((x) => x.email === u.email);
  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({ email: u.email, email_confirm: true, user_metadata: { display_name: u.name } });
    if (error) throw error;
    user = data.user;
  }
  await admin.from('profiles').update({ display_name: u.name, home_municipality_id: muniId('SAB') }).eq('id', user.id);
  if (u.role) {
    const scope = u.role === 'moderator' ? muniId(u.muni) : null;
    const { data: existing } = await admin.from('user_roles').select('id').eq('user_id', user.id).eq('role', u.role);
    if (!existing?.length) {
      const { error } = await admin.from('user_roles').insert({ user_id: user.id, role: u.role, province_id: province.id, municipality_id: scope });
      if (error) throw error;
    }
  }
  console.log(`✓ ${u.email} → ${u.role ?? 'citizen'}${u.role === 'moderator' ? ' (Sabaneta)' : u.role ? ' (provincial)' : ''}`);
}
}
