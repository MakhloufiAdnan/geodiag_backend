/**
 * Centralise les constantes littérales de l'application pour éviter les erreurs
 * et faciliter la maintenance. `Object.freeze` empêche toute modification accidentelle.
 */
export const ROLES = Object.freeze({
  ADMIN: 'admin',
  TECHNICIAN: 'technician',
  SUPER_ADMIN: 'super-admin',
});

export const ORDER_STATUS = Object.freeze({
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
});

export const ERROR_CODES = Object.freeze({
  // Erreurs Client (4xx)
  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',

  // Erreurs Serveur (5xx)
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
});
