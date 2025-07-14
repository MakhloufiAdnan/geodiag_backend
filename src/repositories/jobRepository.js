import { pool } from '../db/index.js';

/**
 * @file Gère l'accès aux données pour la file d'attente des tâches (jobs).
 * @description Ce repository permet de créer et de récupérer des tâches
 * à traiter en arrière-plan.
 */
class JobRepository {
    /**
     * Ajoute une nouvelle tâche à la file d'attente.
     * @param {string} type - Le type de la tâche (ex: 'process_successful_payment').
     * @param {object} payload - Les données nécessaires pour exécuter la tâche.
     * @param {object} [dbClient=pool] - Le client de base de données (pour les transactions).
     * @returns {Promise<object>} La tâche créée.
     */
    async create(type, payload, dbClient = pool) {
        const result = await dbClient.query(
            `INSERT INTO jobs (type, payload)
            VALUES ($1, $2)
            RETURNING id`,
            [type, payload]
        );
        return result.rows;
    }
}

export default new JobRepository();