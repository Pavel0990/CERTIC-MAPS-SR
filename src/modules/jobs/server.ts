// API de servidor del módulo "jobs": consumidor de la cola (ADR-016, ARCHITECTURE.md §11.3).
import 'server-only';
export { runJobs, queueHealth, type RunOptions } from './server/runner';
