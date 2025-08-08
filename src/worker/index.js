import PgBoss from 'pg-boss';
import 'dotenv/config';
import notificationJobHandler from '../jobs/notificationJobHandler.js'; // Le nouvel import
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

  const jobTypeName = 'payment-succeeded';
  const workerOptions = {
    teamSize: 1,
    teamConcurrency: 1,
  };

  // Le worker s'abonne maintenant au nouvel événement 'payment-succeeded'.
  // L'ancienne ligne 'await boss.work('process_successful_payment', paymentJobHandler);' a été supprimée.
  await boss.subscribe(jobTypeName, workerOptions, notificationJobHandler);

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
