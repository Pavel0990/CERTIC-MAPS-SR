// API pública del módulo "map" (segura para el cliente). Única frontera con el proveedor de mapa (ADR-004, ADR-008).
// No conoce reglas de negocio: los demás módulos le entregan capas.
export { MapCanvas, type MapCanvasProps } from './provider/map-canvas';
export { LAYERS, LAYER_BY_ID, ALL_LAYERS, snapBBox, containsBBox, type LayerDef } from './layers';
export type * from './types';
