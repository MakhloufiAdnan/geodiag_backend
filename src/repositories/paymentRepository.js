import { db } from '../db/index.js';

/**
 * @file Gère l'accès et la manipulation des données pour l'entité Payment.
 */
class PaymentRepository {
    /**
     * Crée un nouvel enregistrement de paiement.
     * @param {object} paymentData - Les données du paiement.
     * @param {object} [dbClient=db] - Client optionnel pour les transactions.
     * @returns {Promise<object>} L'objet du paiement créé.
     */
    async create(paymentData, dbClient = db) {
        const { order_id, gateway_ref, amount, status, method } = paymentData;
        const { rows } = await dbClient.query(
            `INSERT INTO payments (order_id, gateway_ref, amount, status, method)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [order_id, gateway_ref, amount, status, method],
        );
        return rows[0];
    }
}

export default new PaymentRepository();