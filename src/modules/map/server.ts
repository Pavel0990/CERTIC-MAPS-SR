// API de servidor del módulo "map" (solo servidor).
import 'server-only';
export { fetchFeatures, fetchAggregates, fetchHotspots, fetchStaticLayers, searchPlaces, type SearchHit } from './server/queries';
