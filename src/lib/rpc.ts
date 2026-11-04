import type { RpcResult } from './http';

/**
 * Resultado de una RPC de dominio (ADR-018). Dos tipos de fallo, separados a propósito:
 * - error de transporte o de la base (`error`): excepción con el nombre de la RPC, que la ruta o la acción convierten en 503;
 * - rechazo de negocio (`{ status: 'rejected', reason }`): es un resultado normal y se devuelve tal cual.
 */
export function asRpcResult(name: string, { data, error }: { data: unknown; error: { message: string } | null }): RpcResult {
  if (error) throw new Error(`${name}: ${error.message}`);
  return data as RpcResult;
}
