import { db } from '../db/index.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

/**
 * @file Gère l'accès et la manipulation des données pour les jetons de rafraîchissement.
 * @description Ce repository implémente la logique de stockage sécurisé (hachage)
 * et de révocation des jetons et de leurs familles.
 * @class RefreshTokenRepository
 */
class RefreshTokenRepository {
  /**
   * Crée et stocke un nouveau jeton de rafraîchissement haché.
   * @param {string} userId - L'ID de l'utilisateur associé au jeton.
   * @param {string} token - Le jeton de rafraîchissement en clair (sera haché).
   * @param {string} familyId - L'UUID de la famille de jetons.
   * @param {Date} expiresAt - La date d'expiration du jeton.
   * @returns {Promise<object>} L'objet du jeton créé depuis la BDD.
   */
  async create(userId, token, familyId, expiresAt) {
    const tokenHash = await bcrypt.hash(token, 10);
    const { rows } = await db.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, family_id, expires_at)
            VALUES ($1, $2, $3, $4) RETURNING token_id, user_id, family_id`,
      [userId, tokenHash, familyId, expiresAt]
    );
    return rows;
  }

  /**
   * Trouve un jeton de rafraîchissement valide par sa valeur en clair de manière optimisée.
   * @param {string} token - Le jeton de rafraîchissement en clair à comparer.
   * @returns {Promise<object|undefined>} L'objet du jeton trouvé, ou undefined.
   */
  async findByToken(token) {
    try {
      // Étape 1: Décoder le token (sans vérifier la signature) pour obtenir des indices.
      const decoded = jwt.decode(token);
      if (!decoded?.userId || !decoded?.familyId) {
        return undefined;
      }

      // Étape 2: Interroger la BDD avec des filtres indexés pour réduire le jeu de résultats.
      const { rows } = await db.query(
        'SELECT * FROM refresh_tokens WHERE user_id = $1 AND family_id = $2 AND is_revoked = false AND expires_at > NOW()',
        [decoded.userId, decoded.familyId]
      );

      // Étape 3: Comparer par hachage uniquement les quelques jetons restants (souvent un seul).
      for (const row of rows) {
        if (await bcrypt.compare(token, row.token_hash)) {
          return row;
        }
      }
      return undefined;
    } catch {
      // Si le décodage échoue (token malformé), le token est invalide.
      return undefined;
    }
  }

  /**
   * Marque un jeton spécifique comme utilisé (révoqué).
   * @param {string} tokenId - L'ID du jeton à marquer comme utilisé.
   * @returns {Promise<void>}
   */
  async revokeTokenById(tokenId) {
    await db.query(
      `UPDATE refresh_tokens SET is_revoked = true WHERE token_id = $1`,
      [tokenId]
    );
  }

  /**
   * Invalide (révoque) tous les jetons appartenant à une même famille.
   * @param {string} familyId - L'UUID de la famille de jetons à révoquer.
   * @returns {Promise<void>}
   */
  async revokeFamily(familyId) {
    await db.query(
      `UPDATE refresh_tokens SET is_revoked = true WHERE family_id = $1`,
      [familyId]
    );
  }
}

export default new RefreshTokenRepository();
