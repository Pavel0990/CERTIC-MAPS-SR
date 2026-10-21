// API pública del módulo "media" (segura para el cliente): compresión y subida de fotos (§10.5).
export { compressImage, uploadPhotos, type PhotoEntity } from './client/photos';
export { cropAvatar, uploadAvatar, deleteAvatar } from './client/avatar';
export { avatarUrl } from './avatar';
