// API pública del módulo "citizen-reports" (segura para el cliente): incidencias y consultas municipales (F5).
export { citizenRequestInput, type CitizenRequestInput } from './schemas';
// Aviso de reporte parecido cercano antes de enviar (alertas de tránsito e incidencias)
export {
  similarReportsInput, checkSimilarReports, supportSimilarReport, similarNotice, parseSimilarItems, SIMILAR_TIMEOUT_MS,
  type SimilarReportsInput, type SimilarReport, type SimilarAction, type SimilarNoticeModel,
} from './similar';
