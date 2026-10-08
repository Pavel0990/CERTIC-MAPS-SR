// API pública del módulo "routes". Otros módulos y las páginas solo importan desde aquí (ADR-008).
// Rutas de ecoturismo: trazado, propuestas, edición y distancia (F3). No confundir con rutas HTTP.
export {
  DIFFICULTIES, ROUTE_KINDS, routeProposalInput, routeUpdateInput,
  type LineGeometry, type RouteProposalInput, type RouteUpdateInput,
} from './schemas';
export { parseGpx, thinPoints } from './gpx';
