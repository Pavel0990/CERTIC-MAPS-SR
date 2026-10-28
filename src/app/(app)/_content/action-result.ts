import 'server-only';
import type { z } from 'zod';
import type { RpcResult } from '@/lib/http';
import { reasonMessage } from '@/lib/vocabulary';

/** Resultado de una Server Action del frente de contenido: siempre serializable y en lenguaje simple. */
export type ActionResult = { status: 'ok'; id: string; extra?: Record<string, unknown> } | { status: 'rejected'; reason: string; message: string };

export function invalid(error: z.ZodError): ActionResult {
  return { status: 'rejected', reason: 'invalid_input', message: error.issues[0]?.message ?? reasonMessage('invalid_field') };
}

export function fromRpc(r: RpcResult, fallbackId = ''): ActionResult {
  if (r.status === 'rejected') return { status: 'rejected', reason: r.reason, message: reasonMessage(r.reason) };
  const extra = Object.fromEntries(Object.entries(r).filter(([k]) => k !== 'status' && k !== 'id'));
  return { status: 'ok', id: typeof r.id === 'string' ? r.id : fallbackId, extra };
}

export function unavailable(): ActionResult {
  return { status: 'rejected', reason: 'unavailable', message: 'No pudimos guardar ahora. Revisa tu conexión e inténtalo otra vez.' };
}
