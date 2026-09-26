// Contrato neutral del mapa: la app habla GeoJSON, nunca `google.maps.*` ni `maplibregl.*` (ADR-004).

export type LayerId = 'business' | 'tourism' | 'route' | 'traffic' | 'request';

export interface MapFeatureProps {
  id: string;
  layer: LayerId;
  title: string;
  category?: string;
  severity?: number;
}

export interface PointGeometry { type: 'Point'; coordinates: [number, number] }
export interface MapFeature { type: 'Feature'; geometry: PointGeometry; properties: MapFeatureProps }
export interface MapFeatureCollection { type: 'FeatureCollection'; features: MapFeature[]; truncated?: boolean }

export interface LineFeature {
  type: 'Feature';
  geometry: { type: 'LineString' | 'MultiLineString'; coordinates: unknown };
  properties: { id: string; title: string; difficulty?: string };
}
export interface AreaFeature {
  type: 'Feature';
  geometry: { type: 'Polygon' | 'MultiPolygon'; coordinates: unknown };
  properties: { id: string; name: string };
}

export interface StaticLayers {
  provinceId: string | null;
  municipalities: { type: 'FeatureCollection'; features: AreaFeature[] };
  routes: { type: 'FeatureCollection'; features: LineFeature[] };
}

export interface MunicipalityAggregate {
  municipality_id: string;
  name: string;
  center: PointGeometry;
  businesses: number;
  tourism: number;
  routes: number;
  traffic: number;
  requests: number;
}

export interface BBox { minLng: number; minLat: number; maxLng: number; maxLat: number }
export interface LatLng { lat: number; lng: number }
