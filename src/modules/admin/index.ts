// API pública del módulo "admin". Otros módulos y las páginas solo importan desde aquí (ADR-008).
// Backend del panel municipal (§9.7): reúne las lecturas y acciones que el personal necesita sobre
// tránsito, consultas, contenido, informes, equipo, auditoría y catálogos. No es dueño de esos datos:
// cada cambio de estado lo valida la RPC del dominio correspondiente en la base (ADR-018).
// Su API está en server.ts (solo servidor).
export {};
