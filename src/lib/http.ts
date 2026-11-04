import 'server-only';
import { NextResponse } from 'next/server';

/** Respuesta de una RPC: `{status:'ok', ...}` o `{status:'rejected', reason}` (DATABASE.md §2.1). */
export type RpcResult = { status: 'ok' | 'skipped'; [k: string]: unknown } | { status: 'rejected'; reason: string; [k: string]: unknown };

const HTTP_BY_REASON: Record<string, number> = {
  not_authenticated: 401,
  forbidden: 403,
  own_request: 403,
  not_found: 404,
  stale_state: 409,
  version_conflict: 409,
  conflict: 409,
  rate_limited: 429,
};

/** Traduce el `reason` de una RPC a HTTP (DATABASE.md §2.2). Los rechazos de validación son 422. */
export function httpStatusFor(reason: string) {
  return HTTP_BY_REASON[reason] ?? 422;
}

/** Devuelve el resultado de una RPC con el código HTTP que corresponde. */
export function rpcResponse(result: RpcResult, okStatus = 200, headers?: HeadersInit) {
  if (result.status === 'rejected') return NextResponse.json(result, { status: httpStatusFor(result.reason), headers });
  return NextResponse.json(result, { status: okStatus, headers });
}

/** Error de protocolo o servidor: sin detalles internos al cliente (§6.3). */
export function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status, headers: { 'Cache-Control': 'no-store' } });
}

export const PUBLIC_CACHE = { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' };
export const LONG_CACHE = { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' };
export const NO_STORE = { 'Cache-Control': 'private, no-store' };
