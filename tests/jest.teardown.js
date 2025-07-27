import { pool } from "../src/db/index.js";
import redisClient from "../src/config/redisClient.js";
import logger from "../src/config/logger.js";
import { testState } from "./global.js";
import boss from "../src/worker.js";

/**
 * @file Script de nettoyage global pour Jest.
 * @description Exécuté une seule fois après la fin de toutes les suites de test.
 * Ce script ferme proprement TOUTES les connexions globales et force la sortie
 * du processus pour garantir une terminaison propre et rapide.
 */
export default async () => {
  logger.info("\nTearing down test environment...");

  // 1. Arrêter le worker de la file d'attente
  if (boss && typeof boss.stop === "function") {
    await boss.stop();
    logger.info("pg-boss worker stopped.");
  }

  // 2. Fermer le serveur HTTP
  if (testState.server) {
    await new Promise((resolve) => testState.server.close(resolve));
    logger.info("HTTP server closed.");
  }

  // 3. Fermer le pool de la base de données
  await pool.end();
  logger.info("Database connection pool closed.");

  // 4. Fermer la connexion Redis
  await redisClient.quit();
  logger.info("Redis connection closed.");

  // 5. Forcer la sortie du processus
  // Après avoir fermé toutes les connexions, on s'assure que Jest se termine
  // proprement, même si une opération asynchrone mineure est encore en attente.
  process.exit(0);
};
