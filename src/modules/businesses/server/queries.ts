import 'server-only';
import type { ServerSupabase } from '@/lib/supabase/server';
import { isOpenNow, localToday, type HourRange } from '../hours';

export interface Promotion { id: string; title: string; description: string | null; valid_from: string; valid_until: string; status: string }

export interface BusinessDetail {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  category_slug: string | null;
  address: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  website: string | null;
  status: string;
  status_reason: string | null;
  version: number;
  updated_at: string;
  municipality_id: string;
  municipality: string | null;
  point: { lat: number; lng: number };
  hours: HourRange[];
  /** Promociones vigentes hoy (activas y dentro de sus fechas). */
  promotions: Promotion[];
}

const hhmm = (t: string) => t.slice(0, 5);

/** Ficha de un negocio. RLS decide si se puede ver (aprobado, miembro del negocio o personal del municipio). */
export async function getBusinessDetail(supabase: ServerSupabase, id: string): Promise<BusinessDetail | null> {
  const { data: b } = await supabase
    .from('businesses')
    .select('id, name, description, address, phone, whatsapp, email, website, status, status_reason, version, updated_at, geom, municipality_id, category_id')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();
  if (!b) return null;
  const g = b.geom as { coordinates?: [number, number] } | null;
  if (!g?.coordinates) return null;
  const today = localToday();
  const [{ data: cat }, { data: muni }, { data: hours }, { data: promos }] = await Promise.all([
    supabase.from('business_categories').select('slug, name').eq('id', b.category_id).maybeSingle(),
    supabase.from('municipalities').select('name').eq('id', b.municipality_id).maybeSingle(),
    supabase.from('business_hours').select('weekday, opens, closes').eq('business_id', id),
    supabase
      .from('promotions')
      .select('id, title, description, valid_from, valid_until, status')
      .eq('business_id', id)
      .eq('status', 'active')
      .lte('valid_from', today)
      .gte('valid_until', today)
      .order('valid_until'),
  ]);
  return {
    id: b.id,
    name: b.name,
    description: b.description,
    category: cat?.name ?? null,
    category_slug: cat?.slug ?? null,
    address: b.address,
    phone: b.phone,
    whatsapp: b.whatsapp,
    email: b.email,
    website: b.website,
    status: b.status,
    status_reason: b.status_reason,
    version: b.version,
    updated_at: b.updated_at,
    municipality_id: b.municipality_id,
    municipality: muni?.name ?? null,
    point: { lng: g.coordinates[0], lat: g.coordinates[1] },
    hours: (hours ?? []).map((h) => ({ weekday: h.weekday, opens: hhmm(h.opens), closes: hhmm(h.closes) })),
    promotions: promos ?? [],
  };
}

export interface MyBusiness { id: string; name: string; status: string; status_reason: string | null; member_role: string }

/** Negocios de los que el usuario es dueño o empleado. */
export async function listMyBusinesses(supabase: ServerSupabase, userId: string): Promise<MyBusiness[]> {
  const { data: members } = await supabase.from('business_members').select('business_id, member_role').eq('user_id', userId);
  if (!members?.length) return [];
  const { data } = await supabase
    .from('businesses')
    .select('id, name, status, status_reason')
    .in('id', members.map((m) => m.business_id))
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  const role = new Map(members.map((m) => [m.business_id, m.member_role]));
  return (data ?? []).map((b) => ({ ...b, member_role: role.get(b.id) ?? 'staff' }));
}

/** ¿El usuario es miembro del negocio? Para mostrar el enlace "Administrar". */
export async function isBusinessMember(supabase: ServerSupabase, businessId: string, userId: string) {
  const { data } = await supabase.from('business_members').select('business_id').eq('business_id', businessId).eq('user_id', userId).maybeSingle();
  return !!data;
}

/** Todas las promociones del negocio (el dueño ve también las pendientes y las vencidas). */
export async function listPromotions(supabase: ServerSupabase, businessId: string): Promise<Promotion[]> {
  const { data } = await supabase
    .from('promotions')
    .select('id, title, description, valid_from, valid_until, status')
    .eq('business_id', businessId)
    .order('valid_from', { ascending: false })
    .limit(30);
  return data ?? [];
}

export interface BusinessStats { days: number; view: number; directions: number; whatsapp: number }

/** Vistas, "cómo llegar" y WhatsApp de los últimos días (engagement_daily; solo miembros y personal). */
export async function getBusinessStats(supabase: ServerSupabase, businessId: string, days = 30): Promise<BusinessStats> {
  const since = localToday(new Date(Date.now() - (days - 1) * 86_400_000));
  const { data } = await supabase
    .from('engagement_daily')
    .select('metric, count')
    .eq('entity_type', 'business')
    .eq('entity_id', businessId)
    .gte('day', since);
  const stats: BusinessStats = { days, view: 0, directions: 0, whatsapp: 0 };
  for (const r of data ?? []) if (r.metric === 'view' || r.metric === 'directions' || r.metric === 'whatsapp') stats[r.metric] += r.count;
  return stats;
}

export interface BusinessListItem {
  id: string;
  name: string;
  category: { slug: string; name: string; icon: string } | null;
  municipality: string;
  phone: string | null;
  whatsapp: string | null;
  openNow: boolean | null; // null = sin horario cargado
}

/**
 * Listado público de negocios aprobados (para quien prefiere una lista a un mapa).
 * Filtros opcionales por municipio, categoría y nombre. Máximo 200, ordenados por nombre.
 */
export async function listBusinesses(
  supabase: ServerSupabase,
  filters: { municipalityId?: string; categorySlug?: string; q?: string } = {},
): Promise<BusinessListItem[]> {
  const [{ data: cats }, { data: munis }] = await Promise.all([
    supabase.from('business_categories').select('id, slug, name, icon'),
    supabase.from('municipalities').select('id, name'),
  ]);
  const catById = new Map((cats ?? []).map((c) => [c.id, c]));
  let query = supabase
    .from('businesses')
    .select('id, name, phone, whatsapp, municipality_id, category_id')
    .eq('status', 'approved')
    .is('deleted_at', null)
    .order('name')
    .limit(500);
  if (filters.municipalityId) query = query.eq('municipality_id', filters.municipalityId);
  if (filters.categorySlug) {
    const cat = (cats ?? []).find((c) => c.slug === filters.categorySlug);
    if (!cat) return [];
    query = query.eq('category_id', cat.id);
  }
  const { data: rows } = await query;
  // Búsqueda sin tildes ni mayúsculas ("moncion" encuentra "Monción"): quien escribe con dificultad no pone tildes
  const fold = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const term = filters.q ? fold(filters.q.trim()).slice(0, 60) : '';
  const list = (rows ?? []).filter((b) => !term || fold(b.name).includes(term)).slice(0, 200);
  const { data: hours } = list.length
    ? await supabase.from('business_hours').select('business_id, weekday, opens, closes').in('business_id', list.map((b) => b.id))
    : { data: [] };
  const hoursBy = new Map<string, HourRange[]>();
  for (const h of hours ?? []) hoursBy.set(h.business_id, [...(hoursBy.get(h.business_id) ?? []), { weekday: h.weekday, opens: hhmm(h.opens), closes: hhmm(h.closes) }]);
  const muniName = new Map((munis ?? []).map((m) => [m.id, m.name]));
  return list.map((b) => {
    const c = catById.get(b.category_id);
    const h = hoursBy.get(b.id);
    return {
      id: b.id,
      name: b.name,
      category: c ? { slug: c.slug, name: c.name, icon: c.icon } : null,
      municipality: muniName.get(b.municipality_id) ?? '',
      phone: b.phone,
      whatsapp: b.whatsapp,
      openNow: h?.length ? isOpenNow(h) : null,
    };
  });
}
