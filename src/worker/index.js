import PgBoss from 'pg-boss';
import 'dotenv/config';
import paymentJobHandler from '../jobs/paymentJobHandler.js';
import dbConfig from '../config/database.js';
import logger from '../config/logger.js';

/**
 * @file Point d'entrée du processus worker.
 * @description Initialise pg-boss, s'abonne aux types de tâches et démarre le traitement.
 * Ce fichier est conçu pour être à la fois un script exécutable et un module importable.
 */

// 1. Définir et créer l'instance de pg-boss.
const boss = new PgBoss(dbConfig);

/**
 * @description Encapsule la logique de démarrage du worker.
 * @async
 */
async function startWorker() {
  // pg-boss s'assure que les tables nécessaires existent.
  await boss.start();
  logger.info('Boss started. Worker is ready to process jobs.');

  const jobTypeName = 'process_successful_payment';
  const workerOptions = {
    teamSize: 1,
    teamConcurrency: 1,
  };

  // Le worker s'abonne aux tâches et les exécute.
  await boss.work(jobTypeName, workerOptions, paymentJobHandler);

  logger.info(`Worker subscribed to '${jobTypeName}' jobs.`);
}

// 2. Démarrer le worker UNIQUEMENT si ce fichier est exécuté directement
if (process.env.JEST_WORKER_ID === undefined) {
  startWorker().catch((error) => {
    logger.fatal({ err: error }, '❌ Failed to start the worker:');
    process.exit(1);
  });
}

// 3. Exporter l'instance `boss`
export default boss;
