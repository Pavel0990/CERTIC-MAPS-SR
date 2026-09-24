// =====================================================================
// SR CONECTA — Definiciones TypeScript del Dominio Territorial
// =====================================================================

export type MunicipalityCode = 'SAB' | 'MON' | 'VLA';

export interface Municipality {
  id: string;
  province_id: string;
  code: MunicipalityCode;
  name: string;
  geom_simplified?: GeoJSON.MultiPolygon;
}

export type UserRoleType = 'citizen' | 'entrepreneur' | 'moderator' | 'municipal_admin';

export interface UserRole {
  id: number;
  user_id: string;
  role: UserRoleType;
  province_id: string;
  municipality_id: string | null; // null = alcance provincial
}

export interface UserProfile {
  id: string;
  display_name: string;
  home_municipality_id?: string | null;
  location_consent: boolean;
  locale: 'es' | 'en';
  reputation: number;
  avatar_url?: string;
  created_at: string;
}

// ---------------------------------------------------------------------
// Comercios y Turismo
// ---------------------------------------------------------------------
export type BusinessStatus = 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'PUBLISHED' | 'REJECTED';

export interface Business {
  id: string;
  province_id: string;
  municipality_id: string;
  category_id: string;
  name: string;
  description: string;
  phone?: string;
  whatsapp?: string;
  website_url?: string;
  lat: number;
  lng: number;
  address: string;
  status: BusinessStatus;
  is_verified: boolean;
  cover_image_url?: string;
  created_at: string;
}

export interface BusinessCategory {
  id: string;
  slug: string;
  name: string;
  icon_name: string;
}

export interface TouristPlace {
  id: string;
  municipality_id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  lat: number;
  lng: number;
  elevation_meters?: number;
  access_difficulty?: 'EASY' | 'MODERATE' | 'HARD';
  is_published: boolean;
  image_url?: string;
}

export interface EcoRoute {
  id: string;
  name: string;
  description: string;
  difficulty: 'EASY' | 'MODERATE' | 'HARD' | 'EXPERT';
  distance_km: number;
  estimated_duration_min: number;
  coordinates: [number, number][]; // [lng, lat]
  elevation_gain_meters?: number;
  start_municipality_id: string;
  is_official: boolean;
}

// ---------------------------------------------------------------------
// Reportes Ciudadanos e Incidencias Viales
// ---------------------------------------------------------------------
export type ReportStatus = 'RECEIVED' | 'UNDER_REVIEW' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED';
export type ReportPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface CitizenReport {
  id: string;
  province_id: string;
  municipality_id: string;
  category_id: string;
  author_id?: string;
  title: string;
  description?: string;
  lat: number;
  lng: number;
  address_reference?: string;
  status: ReportStatus;
  priority: ReportPriority;
  votes_count: number;
  idempotency_key?: string;
  photo_urls?: string[];
  created_at: string;
  resolved_at?: string;
}

export interface ReportStatusHistoryItem {
  id: number;
  report_id: string;
  changed_by: string;
  previous_status: ReportStatus;
  new_status: ReportStatus;
  comment?: string;
  created_at: string;
}

// ---------------------------------------------------------------------
// Misiones y Recompensas
// ---------------------------------------------------------------------
export type MissionType = 'VISIT_LOCATION' | 'SCAN_QR' | 'BUSINESS_INTERACTION' | 'COMMUNITY_REPORT' | 'MULTI_STEP';
export type MissionDifficulty = 'EASY' | 'MEDIUM' | 'HARD' | 'SPECIAL';

export interface Mission {
  id: string;
  province_id: string;
  municipality_id?: string | null;
  business_id?: string | null;
  tourist_place_id?: string | null;
  title: string;
  description: string;
  mission_type: MissionType;
  difficulty: MissionDifficulty;
  reward_points: number;
  is_active: boolean;
  lat?: number | null;
  lng?: number | null;
  radius_meters?: number;
  created_at: string;
}

export type RewardType = 'DISCOUNT_PERCENTAGE' | 'COUPON_AMOUNT' | 'FREE_PRODUCT' | 'EXPERIENCE';

export interface Reward {
  id: string;
  business_id?: string | null;
  mission_id?: string | null;
  title: string;
  description?: string;
  reward_type: RewardType;
  reward_value: number;
  difficulty_tier: MissionDifficulty;
  stock: number;
  initial_stock: number;
  expires_at?: string | null;
  is_active: boolean;
  terms_conditions?: string;
  business_name?: string;
}

export interface RewardRedemption {
  id: string;
  reward_id: string;
  user_id: string;
  redemption_code: string;
  status: 'ISSUED' | 'CLAIMED_AT_MERCHANT' | 'EXPIRED' | 'CANCELLED';
  issued_at: string;
  claimed_at?: string | null;
}

// ---------------------------------------------------------------------
// Pasaporte del Territorio (Identidad Digital)
// ---------------------------------------------------------------------
export type TerritorialBadge = 
  | 'PIONERO_TERRITORIAL'
  | 'EXPLORADOR_DE_SABANETA'
  | 'GUARDIAN_DE_MONCION'
  | 'IMPULSOR_LOCAL'
  | 'GUARDIAN_CIVICO';

export interface TerritorialPassport {
  user_id: string;
  display_name: string;
  reputation: number;
  stats: {
    places_visited: number;
    missions_completed: number;
    rewards_unlocked: number;
    reports_submitted: number;
  };
  badges: TerritorialBadge[];
}

// ---------------------------------------------------------------------
// Notificaciones
// ---------------------------------------------------------------------
export interface InAppNotification {
  id: string;
  user_id: string;
  kind: 'request_status' | 'traffic_status' | 'content_status' | 'traffic_nearby' | 'system';
  title: string;
  body?: string;
  payload: Record<string, unknown>;
  read_at?: string | null;
  created_at: string;
}
