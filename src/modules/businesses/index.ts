// API pública del módulo "businesses". Otros módulos y las páginas solo importan desde aquí (ADR-008).
// Negocios: alta, perfil, horario, fotos, miembros y promociones (F2).
export {
  businessInput, businessUpdateInput, hoursInput, promotionInput,
  type BusinessInput, type BusinessUpdateInput, type HoursInput, type PromotionInput,
} from './schemas';
export { formatTime, hoursByDay, isOpenNow, localToday, promotionStartMin, type HourRange } from './hours';
