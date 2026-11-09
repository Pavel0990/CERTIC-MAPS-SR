// API de servidor del módulo "traffic".
import 'server-only';
export { createTrafficReport, moderateTrafficReport, escalateTrafficReport } from './server/commands';
export { countActiveAlerts } from './server/queries';
