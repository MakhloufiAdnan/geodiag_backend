/**
 * @file Script de nettoyage global pour Jest.
 * @module tests/jest.teardown
 * @description
 * Exécuté une seule fois après la fin de toutes les suites de test, ce script garantit
 * une terminaison propre de l'environnement de test en fermant toutes les connexions
 * externes de manière ordonnée et asynchrone.
 *
 * Il ferme séquentiellement :
 * 1. Le worker de la file d'attente des tâches (pg-boss).
 * 2. Le serveur HTTP de l'application.
 * 3. Le pool de connexions à la base de données PostgreSQL.
 * 4. La connexion au client Redis.
 *
 * L'utilisation de `await` pour chaque étape garantit que Jest attend la fermeture
 * effective de chaque service avant de terminer le processus, évitant ainsi les erreurs
 * de "handles" ouverts.
 */

import { pool } from '../src/db/index.js';
import redisClient from '../src/config/redisClient.js';
import logger from '../src/config/logger.js';
import { testState } from './global.js';
import boss from '../src/worker.js';

export default async () => {
  logger.info('\nTearing down test environment...');

  // 1. Arrêter le worker de la file d'attente
  if (boss && typeof boss.stop === 'function') {
    await boss.stop();
    logger.info('pg-boss worker stopped.');
  }

  // 2. Fermer le serveur HTTP (s'il a été démarré)
  if (testState.server) {
    await new Promise((resolve) => testState.server.close(resolve));
    logger.info('HTTP server closed.');
  }

  // 3. Fermer le pool de la base de données
  await pool.end();
  logger.info('Database connection pool closed.');

  // 4. Fermer la connexion Redis
  await redisClient.quit();
  logger.info('Redis connection closed.');
};
