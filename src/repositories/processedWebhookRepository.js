import { pool } from '../db/index.js';

/**
 * @file Gère l'accès aux données pour les événements de webhook traités.
 * @description Ce repository est utilisé pour assurer l'idempotence en stockant
 * les ID des événements déjà reçus.
 */
class ProcessedWebhookRepository {
    /**
     * Trouve un événement par son ID unique.
     * @param {string} eventId - L'ID de l'événement Stripe.
     * @param {object} [dbClient=pool] - Le client de base de données (pour les transactions).
     * @returns {Promise<object|null>} L'événement trouvé ou null.
     */
    async findById(eventId, dbClient = pool) {
        const result = await dbClient.query(
            'SELECT event_id FROM processed_webhook_events WHERE event_id = $1',
            [eventId]
        );
        return result.rows;
    }

    /**
     * Crée un nouvel enregistrement pour un événement traité.
     * @param {string} eventId - L'ID de l'événement Stripe à enregistrer.
     * @param {object} dbClient - Le client de base de données transactionnel.
     * @returns {Promise<object>} L'enregistrement créé.
     */
    async create(eventId, dbClient) {
        const result = await dbClient.query(
            'INSERT INTO processed_webhook_events (event_id) VALUES ($1) RETURNING event_id',
            [eventId]
        );
        return result.rows;
    }
}

export default new ProcessedWebhookRepository();