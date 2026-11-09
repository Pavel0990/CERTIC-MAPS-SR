// API de servidor del módulo "tourism".
import 'server-only';
export { proposePlace, updatePlace } from './server/commands';
export { getPlaceDetail, listPlaces, type PlaceDetail, type PlaceListItem } from './server/queries';
