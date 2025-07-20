import { pool } from '../src/db/index.js';
import redisClient from '../src/config/redisClient.js';
import logger from '../src/config/logger.js';
/**
 * Ce script est exécuté une seule fois après la fin de toutes les suites de test.
 * Il ferme proprement toutes les connexions ouvertes pour permettre à Jest de se terminer.
 */
export default async () => {
    logger.info('\nTearing down test environment...');
    redisClient.disconnect();
    logger.info('Redis connection closed.');

    // Ferme le pool de connexions à la base de données
    await pool.end();
    logger.info('PostgreSQL pool closed.');
};