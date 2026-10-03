'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { moderateTrafficReport, escalateTrafficReport } from '@/modules/traffic/server';
import { assignRequest, changeRequestStatus, setRequestPublic } from '@/modules/citizen-reports/server';
import { assignRole, authorizeReportDownload, requestWeeklyReport, reviewContent, revokeRole, type ContentEntity } from '@/modules/admin/server';
import { createClient } from '@/lib/supabase/server';
import type { RpcResult } from '@/lib/http';

// Acciones del panel municipal. Validan la forma; la RPC decide permisos, alcance y transición (ADR-018).
export type ActionResult = { status: 'ok' | 'rejected'; reason?: string };

const uuid = z.uuid();
const text = (max: number) => z.string().trim().max(max).optional();

async function run(fn: (s: Awaited<ReturnType<typeof createClient>>) => Promise<RpcResult>, paths: string[]): Promise<ActionResult> {
  try {
    const r = await fn(await createClient());
    for (const p of paths) revalidatePath(p);
    return r.status === 'rejected' ? { status: 'rejected', reason: r.reason } : { status: 'ok' };
  } catch {
    return { status: 'rejected', reason: 'unavailable' };
  }
}

export async function moderateTraffic(id: string, expected: string, to: string, note?: string) {
  if (!uuid.safeParse(id).success) return { status: 'rejected', reason: 'not_found' } as ActionResult;
  return run((s) => moderateTrafficReport(s, id, expected, to, text(500).parse(note)), ['/admin/bandeja', '/admin']);
}

export async function escalateTraffic(id: string, category: string) {
  if (!uuid.safeParse(id).success) return { status: 'rejected', reason: 'not_found' } as ActionResult;
  return run((s) => escalateTrafficReport(s, id, category), ['/admin/bandeja']);
}

export async function changeStatus(id: string, expected: string, to: string, note?: string) {
  if (!uuid.safeParse(id).success) return { status: 'rejected', reason: 'not_found' } as ActionResult;
  return run((s) => changeRequestStatus(s, id, expected, to, text(1000).parse(note)), ['/admin/bandeja', '/admin', `/consultas/${id}`]);
}

export async function assign(id: string, assignee: string) {
  if (!uuid.safeParse(id).success || !uuid.safeParse(assignee).success) return { status: 'rejected', reason: 'not_found' } as ActionResult;
  return run((s) => assignRequest(s, id, assignee), ['/admin/bandeja']);
}

export async function makePublic(id: string, isPublic: boolean) {
  if (!uuid.safeParse(id).success) return { status: 'rejected', reason: 'not_found' } as ActionResult;
  return run((s) => setRequestPublic(s, id, isPublic), ['/admin/bandeja', '/mapa']);
}

const ENTITIES: ContentEntity[] = ['business', 'place', 'route', 'promotion', 'attachment'];
export async function review(entity: ContentEntity, id: string, expected: string, to: string, reason?: string) {
  if (!ENTITIES.includes(entity) || !uuid.safeParse(id).success) return { status: 'rejected', reason: 'not_found' } as ActionResult;
  return run((s) => reviewContent(s, entity, id, expected, to, text(500).parse(reason)), ['/admin/validaciones', '/admin', '/mapa']);
}

export async function grantRole(userId: string, role: 'moderator' | 'municipal_admin', municipalityId: string) {
  if (!uuid.safeParse(userId).success || !uuid.safeParse(municipalityId).success) return { status: 'rejected', reason: 'not_found' } as ActionResult;
  return run((s) => assignRole(s, userId, role, municipalityId), ['/admin/equipo']);
}

export async function removeRole(userId: string, role: 'moderator' | 'municipal_admin', municipalityId: string) {
  if (!uuid.safeParse(userId).success || !uuid.safeParse(municipalityId).success) return { status: 'rejected', reason: 'not_found' } as ActionResult;
  return run((s) => revokeRole(s, userId, role, municipalityId), ['/admin/equipo']);
}

/** Descarga auditada del PDF: devuelve una URL firmada de 5 minutos (ADR-021). */
export async function downloadReport(runId: string): Promise<ActionResult & { url?: string }> {
  if (!uuid.safeParse(runId).success) return { status: 'rejected', reason: 'not_found' };
  try {
    return await authorizeReportDownload(await createClient(), runId);
  } catch {
    return { status: 'rejected', reason: 'unavailable' };
  }
}

export async function generateReport(periodStart: string) {
  if (!z.iso.date().safeParse(periodStart).success) return { status: 'rejected', reason: 'invalid_period' } as ActionResult;
  return run((s) => requestWeeklyReport(s, periodStart), ['/admin/informes']);
}
