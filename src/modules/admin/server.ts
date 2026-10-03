// API de servidor del módulo "admin": lecturas y acciones del panel municipal (§9.7).
export { scopeMunicipalities, listTrafficInbox, listRequestInbox, staffDirectory, listValidationQueue, getKpis, listReportRuns, listAudit, listTeam, searchPeople, type Kpis, type Municipality, type RequestItem, type TrafficItem } from './server/queries';
export { reviewContent, assignRole, revokeRole, authorizeReportDownload, requestWeeklyReport, type ContentEntity } from './server/commands';
