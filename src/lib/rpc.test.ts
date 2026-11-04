import { describe, expect, it } from 'vitest';
import { asRpcResult } from './rpc';

describe('asRpcResult', () => {
  it('devuelve el resultado de la RPC, también un rechazo de negocio', () => {
    expect(asRpcResult('x', { data: { status: 'ok', id: 'a' }, error: null })).toEqual({ status: 'ok', id: 'a' });
    expect(asRpcResult('x', { data: { status: 'rejected', reason: 'forbidden' }, error: null })).toEqual({ status: 'rejected', reason: 'forbidden' });
  });
  it('convierte un error de la base en excepción con el nombre de la RPC', () => {
    expect(() => asRpcResult('create_traffic_report', { data: null, error: { message: 'timeout' } })).toThrow('create_traffic_report: timeout');
  });
});
