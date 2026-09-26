// Vocabulario del dominio en lenguaje simple (baja alfabetización digital, §6.2).
// Los códigos coinciden con los CHECK del SQL (supabase/migrations); los textos son para personas.
import type { Tone } from '@/types/ui';

export type RequestStatus = 'pending' | 'under_review' | 'approved' | 'in_progress' | 'resolved' | 'rejected' | 'archived';
export type TrafficStatus = 'pending' | 'active' | 'verified' | 'resolved' | 'rejected' | 'expired' | 'out_of_area';
export type ContentStatus = 'pending' | 'under_review' | 'approved' | 'published' | 'rejected' | 'suspended' | 'archived' | 'active' | 'paused' | 'draft' | 'processed';

interface StatusInfo { label: string; tone: Tone; explain: string }

export const REQUEST_STATUS: Record<RequestStatus, StatusInfo> = {
  pending: { label: 'Recibido', tone: 'neutral', explain: 'Llegó al municipio. Pronto lo revisan.' },
  under_review: { label: 'En revisión', tone: 'warn', explain: 'Lo están revisando.' },
  approved: { label: 'Aprobado', tone: 'violet', explain: 'Es válido y está en la lista de trabajo.' },
  in_progress: { label: 'En proceso', tone: 'brand', explain: 'Ya están trabajando en esto.' },
  resolved: { label: 'Resuelto', tone: 'ok', explain: 'El municipio lo marcó como resuelto.' },
  rejected: { label: 'No procede', tone: 'danger', explain: 'No se pudo atender. Mira el motivo.' },
  archived: { label: 'Cerrado', tone: 'neutral', explain: 'Se resolvió hace tiempo y se archivó.' },
};

/** Orden del camino feliz para la línea de tiempo. */
export const REQUEST_FLOW: RequestStatus[] = ['pending', 'under_review', 'approved', 'in_progress', 'resolved'];

export const TRAFFIC_STATUS: Record<TrafficStatus, StatusInfo> = {
  pending: { label: 'Por confirmar', tone: 'warn', explain: 'Un moderador lo confirmará pronto.' },
  active: { label: 'Activo', tone: 'danger', explain: 'Se ve en el mapa ahora mismo.' },
  verified: { label: 'Verificado', tone: 'danger', explain: 'Confirmado por el municipio.' },
  resolved: { label: 'Resuelto', tone: 'ok', explain: 'Ya no está.' },
  rejected: { label: 'Descartado', tone: 'neutral', explain: 'No se publicó.' },
  expired: { label: 'Vencido', tone: 'neutral', explain: 'Pasó su tiempo y salió del mapa.' },
  out_of_area: { label: 'Fuera de la provincia', tone: 'neutral', explain: 'El punto está fuera de Santiago Rodríguez.' },
};

export const CONTENT_STATUS: Record<ContentStatus, StatusInfo> = {
  draft: { label: 'Borrador', tone: 'neutral', explain: '' },
  pending: { label: 'Por revisar', tone: 'warn', explain: 'Un moderador lo revisará.' },
  under_review: { label: 'En revisión', tone: 'warn', explain: 'Lo están verificando.' },
  approved: { label: 'Aprobado', tone: 'ok', explain: 'Ya aparece en el mapa.' },
  published: { label: 'Publicado', tone: 'ok', explain: 'Ya aparece en el mapa.' },
  active: { label: 'Activa', tone: 'ok', explain: 'Se muestra al público.' },
  processed: { label: 'Lista para revisar', tone: 'warn', explain: '' },
  paused: { label: 'Pausada', tone: 'neutral', explain: '' },
  rejected: { label: 'No aprobado', tone: 'danger', explain: 'Mira el motivo.' },
  suspended: { label: 'Suspendido', tone: 'danger', explain: 'No aparece en el mapa.' },
  archived: { label: 'Archivado', tone: 'neutral', explain: '' },
};

export const SEVERITY: Record<number, { label: string; tone: Tone }> = {
  1: { label: 'Leve', tone: 'warn' },
  2: { label: 'Media', tone: 'danger' },
  3: { label: 'Grave', tone: 'danger' },
};

export const PLACE_KIND: Record<string, string> = {
  mirador: 'Mirador',
  rio_balneario: 'Río o balneario',
  cultural: 'Sitio cultural',
  historico: 'Sitio histórico',
  agroturismo: 'Agroturismo',
  naturaleza: 'Naturaleza',
  otro: 'Otro',
};

export const ROUTE_KIND: Record<string, string> = { ecologica: 'Ecológica', cultural: 'Cultural', aventura: 'Aventura' };
export const DIFFICULTY: Record<string, { label: string; tone: Tone }> = {
  baja: { label: 'Fácil', tone: 'ok' },
  media: { label: 'Media', tone: 'warn' },
  alta: { label: 'Difícil', tone: 'danger' },
};

export const WEEKDAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'] as const;

/** Mensaje para las razones de rechazo de las RPC (DATABASE.md §2.2), en lenguaje simple. */
export const REASON_MESSAGE: Record<string, string> = {
  not_authenticated: 'Tienes que entrar a tu cuenta para hacer esto.',
  forbidden: 'No tienes permiso para hacer esto.',
  own_request: 'No puedes votar por tu propio reporte.',
  not_found: 'No lo encontramos. Puede que ya no exista.',
  stale_state: 'Alguien lo cambió antes que tú. Actualizamos la vista.',
  version_conflict: 'Otra persona editó esto al mismo tiempo. Revisa los datos y guarda otra vez.',
  rate_limited: 'Hiciste muchas veces esta acción. Espera un rato y vuelve a intentarlo.',
  out_of_area: 'Ese punto está fuera de la provincia Santiago Rodríguez.',
  invalid_coordinates: 'La ubicación no es válida. Marca el punto en el mapa.',
  invalid_description: 'Cuéntanos un poco más (al menos 10 letras).',
  invalid_title: 'Escribe un título corto (entre 3 y 120 letras).',
  invalid_name: 'Escribe un nombre (entre 2 y 120 letras).',
  invalid_type: 'Elige un tipo de la lista.',
  invalid_category: 'Elige una categoría de la lista.',
  location_required: 'Marca en el mapa dónde está el problema.',
  municipality_required: 'Elige el municipio.',
  not_votable: 'Este reporte todavía no recibe votos.',
  not_approved: 'El negocio todavía no está aprobado.',
  business_not_approved: 'El negocio todavía no está aprobado.',
  too_many_photos: 'Ya llegaste al máximo de fotos.',
  invalid_file: 'La foto no es válida. Usa JPG, PNG o WebP de hasta 5 MB.',
  upload_not_found: 'La foto no terminó de subir. Inténtalo otra vez.',
  invalid_transition: 'Ese cambio de estado no está permitido.',
  note_required: 'Escribe una nota para el ciudadano.',
  reason_required: 'Escribe el motivo.',
  assignee_required: 'Asigna un responsable antes de avanzar.',
  no_changes: 'No hay cambios para guardar.',
  not_ready: 'El informe todavía no está listo.',
  invalid_geometry: 'El trazado no es válido.',
  bbox_too_large: 'Acerca el mapa para ver los detalles.',
};

export const reasonMessage = (reason?: string | null) =>
  (reason && REASON_MESSAGE[reason]) ?? 'No se pudo completar. Inténtalo otra vez en un momento.';
