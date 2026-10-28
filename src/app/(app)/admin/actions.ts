'use server';
import { revalidatePath, updateTag } from 'next/cache';
import { z } from 'zod';
import { moderateTrafficReport, escalateTrafficReport } from '@/modules/traffic/server';
import { assignRequest, changeRequestStatus, setRequestPublic } from '@/modules/citizen-reports/server';
import { assignRole, authorizeReportDownload, requestWeeklyReport, reviewContent, revokeRole, saveCatalogItem, type ContentEntity } from '@/modules/admin/server';
import { CATALOGS_TAG } from '@/lib/catalogs';
import { createClient } from '@/lib/supabase/server';
import type { RpcResult } from '@/lib/http';
import type { StaffRole } from '@/types/roles';
import type { StatusResult } from '@/types/ui';

// Acciones del panel municipal. Validan la forma; la RPC decide permisos, alcance y transición (ADR-018).
const rejected = (reason: string): StatusResult => ({ status: 'rejected', reason });

const uuid = z.uuid();
const text = (max: number) => z.string().trim().max(max).optional();

async function run(fn: (s: Awaited<ReturnType<typeof createClient>>) => Promise<RpcResult>, paths: string[]): Promise<StatusResult> {
  try {
    const r = await fn(await createClient());
    for (const p of paths) revalidatePath(p);
    return r.status === 'rejected' ? rejected(r.reason) : { status: 'ok' };
  } catch {
    return rejected('unavailable');
  }
}

export async function moderateTraffic(id: string, expected: string, to: string, note?: string) {
  if (!uuid.safeParse(id).success) return rejected('not_found');
  return run((s) => moderateTrafficReport(s, id, expected, to, text(500).parse(note)), ['/admin/bandeja', '/admin']);
}

export async function escalateTraffic(id: string, category: string) {
  if (!uuid.safeParse(id).success) return rejected('not_found');
  return run((s) => escalateTrafficReport(s, id, category), ['/admin/bandeja']);
}

export async function changeStatus(id: string, expected: string, to: string, note?: string) {
  if (!uuid.safeParse(id).success) return rejected('not_found');
  return run((s) => changeRequestStatus(s, id, expected, to, text(1000).parse(note)), ['/admin/bandeja', '/admin', `/consultas/${id}`]);
}

export async function assign(id: string, assignee: string) {
  if (!uuid.safeParse(id).success || !uuid.safeParse(assignee).success) return rejected('not_found');
  return run((s) => assignRequest(s, id, assignee), ['/admin/bandeja']);
}

export async function makePublic(id: string, isPublic: boolean) {
  if (!uuid.safeParse(id).success) return rejected('not_found');
  return run((s) => setRequestPublic(s, id, isPublic), ['/admin/bandeja', '/mapa']);
}

const ENTITIES: ContentEntity[] = ['business', 'place', 'route', 'promotion', 'attachment'];
export async function review(entity: ContentEntity, id: string, expected: string, to: string, reason?: string) {
  if (!ENTITIES.includes(entity) || !uuid.safeParse(id).success) return rejected('not_found');
  return run((s) => reviewContent(s, entity, id, expected, to, text(500).parse(reason)), ['/admin/validaciones', '/admin', '/mapa']);
}

export async function grantRole(userId: string, role: StaffRole, municipalityId: string) {
  if (!uuid.safeParse(userId).success || !uuid.safeParse(municipalityId).success) return rejected('not_found');
  return run((s) => assignRole(s, userId, role, municipalityId), ['/admin/equipo']);
}

export async function removeRole(userId: string, role: StaffRole, municipalityId: string) {
  if (!uuid.safeParse(userId).success || !uuid.safeParse(municipalityId).success) return rejected('not_found');
  return run((s) => revokeRole(s, userId, role, municipalityId), ['/admin/equipo']);
}

/** Descarga auditada del PDF: devuelve una URL firmada de 5 minutos (ADR-021). */
export async function downloadReport(runId: string): Promise<StatusResult & { url?: string }> {
  if (!uuid.safeParse(runId).success) return rejected('not_found');
  try {
    return await authorizeReportDownload(await createClient(), runId);
  } catch {
    return rejected('unavailable');
  }
}

export async function generateReport(periodStart: string) {
  if (!z.iso.date().safeParse(periodStart).success) return rejected('invalid_period');
  return run((s) => requestWeeklyReport(s, periodStart), ['/admin/informes']);
}

const catalogChanges = z.object({
  name: z.string().trim().min(2).max(60).optional(),
  icon: z.string().regex(/^[a-z0-9-]{2,30}$/).optional(),
  sort: z.number().int().min(0).max(999).optional(),
  active: z.boolean().optional(),
  kind: z.enum(['incident', 'inquiry']).optional(),
  default_severity: z.number().int().min(1).max(3).optional(),
  default_ttl_hours: z.number().int().min(1).max(720).optional(),
}).strict();

export async function saveCatalog(catalog: string, code: string | null, changes: unknown) {
  if (!['traffic_types', 'request_categories', 'business_categories'].includes(catalog)) return rejected('invalid_catalog');
  const parsed = catalogChanges.safeParse(changes);
  if (!parsed.success) return rejected('invalid_field');
  const r = await run((s) => saveCatalogItem(s, catalog, code, parsed.data), ['/admin/catalogos']);
  if (r.status === 'ok') updateTag(CATALOGS_TAG); // el cambio se ve enseguida en el mapa y los formularios
  return r;
}
