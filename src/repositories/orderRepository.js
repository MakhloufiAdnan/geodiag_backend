import { db } from '../db/index.js';

/**
 * @file Gère l'accès et la manipulation des données pour l'entité Order.
 */
class OrderRepository {
  /**
   * Crée une nouvelle commande.
   * @param {object} orderData - Les données de la commande.
   * @param {object} [dbClient=db] - Client optionnel pour les transactions.
   * @returns {Promise<object>} L'objet de la commande créée.
   */
  async create(orderData, dbClient = db) {
    const { company_id, offer_id, order_number, amount } = orderData;
    const { rows } = await dbClient.query(
      `INSERT INTO orders (company_id, offer_id, order_number, amount, status)
             VALUES ($1, $2, $3, $4, 'pending') RETURNING *`,
      [company_id, offer_id, order_number, amount]
    );
    return rows[0];
  }

  /**
   * Trouve une commande par son ID.
   * @param {string} id - L'ID de la commande.
   * @returns {Promise<object|undefined>} L'objet commande s'il est trouvé.
   */
  async findById(id) {
    const { rows } = await db.query(
      'SELECT * FROM orders WHERE order_id = $1',
      [id]
    );
    return rows[0];
  }

  /**
   * Met à jour le statut d'une commande.
   * @param {string} orderId - L'ID de la commande à mettre à jour.
   * @param {string} status - Le nouveau statut de la commande.
   * @param {object} [dbClient=db] - Client optionnel pour les transactions.
   * @returns {Promise<object>} L'objet de la commande mise à jour.
   */
  async updateStatus(orderId, status, dbClient = db) {
    const { rows } = await dbClient.query(
      'UPDATE orders SET status = $1, updated_at = NOW() WHERE order_id = $2 RETURNING *',
      [status, orderId]
    );
    return rows[0];
  }

  /**
   * Trouve plusieurs compagnies par leurs ID.
   * @param {Array<string>} ids - Un tableau d'ID de compagnies.
   * @returns {Promise<Array<object>>} Un tableau de compagnies.
   */
  async findByIds(ids) {
    const { rows } = await db.query(
      'SELECT * FROM orders WHERE order_id = ANY($1::uuid[])',
      [ids]
    );
    return rows;
  }
}

export default new OrderRepository();
