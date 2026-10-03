// API pública del módulo "routes". Otros módulos y las páginas solo importan desde aquí (ADR-008).
// Rutas de ecoturismo: trazado, propuestas, edición y distancia (F3). No confundir con rutas HTTP.
export {
  DIFFICULTIES, MAX_ROUTE_POINTS, ROUTE_KINDS, lineGeometry, routeProposalInput, routeUpdateInput,
  type LineGeometry, type RouteProposalInput, type RouteUpdateInput,
} from './schemas';
export { parseGpx, thinPoints } from './gpx';
