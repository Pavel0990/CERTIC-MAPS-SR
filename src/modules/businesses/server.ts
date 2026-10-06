// API de servidor del módulo "businesses".
export { createPromotion, setBusinessHours, submitBusiness, updateBusiness } from './server/commands';
export {
  getBusinessDetail, getBusinessStats, isBusinessMember, listBusinesses, listMyBusinesses, listPromotions,
  type BusinessDetail, type BusinessListItem, type BusinessStats, type MyBusiness, type Promotion,
} from './server/queries';
