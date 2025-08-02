/**
 * @file Gère l'accès et la manipulation des données pour l'entité Offer.
 * @description Ce repository fournit des méthodes pour interagir directement avec la table "offers".
 */
import { db } from '../db/index.js';

class OfferRepository {
  /**
   * Récupère TOUTES les offres de la base de données, sans filtre.
   * Destiné à un usage administratif.
   * @returns {Promise<Array<object>>} Un tableau de toutes les offres.
   */
  async findAll() {
    const { rows } = await db.query('SELECT * FROM offers ORDER BY price');
    return rows;
  }

  /**
   * Récupère toutes les offres marquées comme publiques.
   * @returns {Promise<Array<object>>} Un tableau des offres publiques.
   */
  async findAllPublic() {
    const { rows } = await db.query(
      'SELECT * FROM offers WHERE is_public = true ORDER BY price'
    );
    return rows;
  }

  /**
   * Trouve une offre par son ID.
   * @param {string} id - L'ID de l'offre.
   * @returns {Promise<object|undefined>} L'objet offre s'il est trouvé.
   */
  async findById(id) {
    const { rows } = await db.query(
      'SELECT * FROM offers WHERE offer_id = $1',
      [id]
    );
    return rows[0];
  }

  /**
   * Trouve plusieurs offres par leurs ID (utilisé par DataLoader).
   * @param {Array<string>} ids - Un tableau d'ID d'offres.
   * @returns {Promise<Array<object>>} Un tableau d'offres.
   */
  async findByIds(ids) {
    const { rows } = await db.query(
      'SELECT * FROM offers WHERE offer_id = ANY($1::uuid[])',
      [ids]
    );
    return rows;
  }

  /**
   * Crée une nouvelle offre.
   * @param {object} offerData
   * @returns {Promise<object>}
   */
  async create(offerData) {
    const { name, description, price, durationMonths, maxUsers, isPublic } =
      offerData;
    const { rows } = await db.query(
      `INSERT INTO offers (name, description, price, duration_months, max_users, is_public)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [name, description, price, durationMonths, maxUsers, isPublic]
    );
    return rows[0];
  }

  /**
   * Met à jour une offre existante.
   * @param {string} id
   * @param {object} offerData
   * @returns {Promise<object|undefined>}
   */
  async update(id, offerData) {
    const { name, description, price, durationMonths, maxUsers, isPublic } =
      offerData;
    const { rows } = await db.query(
      `UPDATE offers SET
         name = COALESCE($1, name),
         description = COALESCE($2, description),
         price = COALESCE($3, price),
         duration_months = COALESCE($4, duration_months),
         max_users = COALESCE($5, max_users),
         is_public = COALESCE($6, is_public),
         updated_at = NOW()
       WHERE offer_id = $7 RETURNING *`,
      [name, description, price, durationMonths, maxUsers, isPublic, id]
    );
    return rows[0];
  }

  /**
   * Supprime une offre de la base de données.
   * @param {string} id - L'ID de l'offre à supprimer.
   * @param {object} [dbClient=db] - Un client de base de données optionnel pour les transactions.
   * @returns {Promise<object|undefined>} L'objet de l'offre supprimée, ou undefined si non trouvée.
   */
  async delete(id, dbClient = db) {
    const { rows } = await dbClient.query(
      'DELETE FROM offers WHERE offer_id = $1 RETURNING *',
      [id]
    );
    return rows[0];
  }
}

export default new OfferRepository();
