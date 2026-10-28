/** Tonos semánticos compartidos por la interfaz y el vocabulario del dominio. */
export type Tone = 'neutral' | 'brand' | 'ok' | 'warn' | 'danger' | 'violet';

/** Resultado de una Server Action que solo informa si se hizo y, si no, por qué (`reason` de la RPC). */
export type StatusResult = { status: 'ok' | 'rejected'; reason?: string };
