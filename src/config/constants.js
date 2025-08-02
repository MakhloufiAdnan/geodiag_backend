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
