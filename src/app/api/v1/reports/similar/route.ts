import { NextResponse } from 'next/server';
import { similarReportsInput } from '@/modules/citizen-reports';
import { findSimilarReports } from '@/modules/citizen-reports/server';
import { NO_STORE, errorResponse } from '@/lib/http';
import { readJson, requireApiUser } from '@/lib/api-auth';

// POST /api/v1/reports/similar — ¿hay un reporte abierto del mismo tipo a menos de 150 m? (DATABASE.md §5.23)
// Route Handler y no Server Action (ADR-023): el asistente la corta a los 1,5 s con AbortController y una acción no se
// puede cancelar (además ocuparía la cola del router). Nunca falla hacia el asistente: sin la RPC en la base, con error
// o con el límite de uso agotado responde una lista vacía.
export async function POST(request: Request) {
  const auth = await requireApiUser(request);
  if ('error' in auth) return auth.error;
  const parsed = similarReportsInput.safeParse(await readJson(request));
  if (!parsed.success) return errorResponse(400, 'invalid_body', 'Datos inválidos.');
  const items = await findSimilarReports(auth.supabase, parsed.data);
  return NextResponse.json({ status: 'ok', items }, { headers: NO_STORE });
}
