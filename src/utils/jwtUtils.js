import jwt from 'jsonwebtoken';

/**
 * @file Utilitaires pour la génération et la vérification des JSON Web Tokens (JWT).
 */

/**
 * Génère un jeton d'accès (Access Token) à courte durée de vie.
 * @param {object} payload - Les données à inclure dans le jeton (ex: { userId, role }).
 * @returns {string} Le jeton JWT signé.
 */
export function generateAccessToken(payload) {
  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRATION || '15m',
  });
}

/**
 * Génère un jeton de rafraîchissement (Refresh Token) à longue durée de vie.
 * @param {object} payload - Les données à inclure dans le jeton (ex: { userId, familyId }).
 * @returns {string} Le jeton JWT signé.
 */
export function generateRefreshToken(payload) {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRATION || '7d',
  });
}
