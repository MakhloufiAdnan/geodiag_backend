import { ERROR_CODES } from '../config/constants.js';

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
   * @param {string} errorCode - Le code d'erreur métier provenant des constantes.
   */
  constructor(statusCode, message, errorCode) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
  }
}

/** Erreur pour les ressources non trouvées (404) */
export class NotFoundException extends ApiException {
  constructor(message = 'Ressource non trouvée') {
    super(404, message, ERROR_CODES.NOT_FOUND);
  }
}

/** Erreur pour les requêtes mal formées (400) */
export class BadRequestException extends ApiException {
  constructor(message = 'Requête invalide') {
    super(400, message, ERROR_CODES.BAD_REQUEST);
  }
}

/** Erreur pour les problèmes d'authentification (401) */
export class UnauthorizedException extends ApiException {
  constructor(message = 'Accès non autorisé') {
    super(401, message, ERROR_CODES.UNAUTHORIZED);
  }
}

/** Erreur pour les problèmes de permissions (403) */
export class ForbiddenException extends ApiException {
  constructor(message = 'Accès refusé') {
    super(403, message, ERROR_CODES.FORBIDDEN);
  }
}

/** Erreur pour les conflits (ex: ressource déjà existante) (409) */
export class ConflictException extends ApiException {
  constructor(message = 'La ressource existe déjà.') {
    super(409, message, ERROR_CODES.CONFLICT);
  }
}
