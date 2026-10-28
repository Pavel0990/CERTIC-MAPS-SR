/** Tonos semánticos compartidos por la interfaz y el vocabulario del dominio. */
export type Tone = 'neutral' | 'brand' | 'ok' | 'warn' | 'danger' | 'violet';

/** Resultado de una Server Action que solo informa si se hizo y, si no, por qué (`reason` de la RPC). */
export type StatusResult = { status: 'ok' | 'rejected'; reason?: string };

/** Rechazo de una Server Action con su `reason` (el texto para personas sale de `reasonMessage`). */
export const rejected = (reason: string): StatusResult => ({ status: 'rejected', reason });
