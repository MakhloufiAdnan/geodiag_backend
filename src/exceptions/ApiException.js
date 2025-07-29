/**
 * @file Définit les classes d'exceptions personnalisées pour l'API.
 */

/**
 * Classe de base pour les erreurs applicatives.
 * @class ApiException
 * @extends {Error}
 */
export class ApiException extends Error {
  /**
   * @param {number} statusCode - Le code de statut HTTP.
   * @param {string} message - Le message d'erreur clair.
   */
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

/** Erreur pour les ressources non trouvées (404) */
export class NotFoundException extends ApiException {
  constructor(message = 'Ressource non trouvée') {
    super(404, message);
  }
}

/** Erreur pour les requêtes mal formées (400) */
export class BadRequestException extends ApiException {
  constructor(message = 'Requête invalide') {
    super(400, message);
  }
}

/** Erreur pour les problèmes d'authentification (401) */
export class UnauthorizedException extends ApiException {
  constructor(message = 'Accès non autorisé') {
    super(401, message);
  }
}

/** Erreur pour les problèmes de permissions (403) */
export class ForbiddenException extends ApiException {
  constructor(message = 'Accès refusé') {
    super(403, message);
  }
}

/** Erreur pour les conflits (ex: ressource déjà existante) (409) */
export class ConflictException extends ApiException {
  constructor(message = 'La ressource existe déjà.') {
    super(409, message);
  }
}
