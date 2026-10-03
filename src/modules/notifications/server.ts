// API de servidor del módulo "notifications": centro in-app, preferencias y canales (§9.5).
export { listNotifications, markAllRead, getPreferences, notificationHref, TOPICS, type NotificationView } from './server/queries';
export { notificationJobHandlers } from './server/worker';
