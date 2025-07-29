import 'dotenv/config';
import logger from '../src/config/logger.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import { testState } from './global.js';
import { createTestApp } from './helpers/app.js';
import boss from '../src/worker.js';

const execAsync = promisify(exec);

/**
 * @file Script de configuration globale pour Jest.
 * @description Exécuté une seule fois avant toutes les suites de test. Ce script
 * applique les migrations à la base de données de test fournie par l'environnement.
 */
export default async () => {
  logger.info("\n[GLOBAL SETUP] Configuration de l'environnement de test...");

  // --- Étape 1: Exécution des migrations ---
  if (!process.env.DATABASE_URL) {
    logger.error(
      "FATAL : La variable d'environnement DATABASE_URL n'est pas définie."
    );
    process.exit(1); // Arrête tout si la BDD n'est pas configurable
  }

  try {
    logger.info(
      '[GLOBAL SETUP] Exécution des migrations sur la base de données de test...'
    );
    await execAsync('npm run migrate up', { env: { ...process.env } });
    logger.info('[GLOBAL SETUP] Migrations terminées avec succès.');
  } catch (error) {
    logger.error("Échec de l'exécution des migrations :", error);
    process.exit(1);
  }

  // --- Étape 2: Démarrage du serveur et des services ---
  try {
    logger.info(
      '[GLOBAL SETUP] Démarrage des services et du serveur de test...'
    );

    // Démarrer le worker pour les tâches asynchrones
    await boss.start();
    logger.info('[GLOBAL SETUP] Worker pg-boss démarré.');

    // Créer et démarrer l'instance de l'application pour les tests
    const { app, server } = createTestApp();

    // Stocker les instances dans l'état global pour les réutiliser
    testState.app = app;
    testState.server = server;

    logger.info('[GLOBAL SETUP] Serveur HTTP démarré et prêt pour les tests.');
  } catch (error) {
    logger.error('Échec du démarrage du serveur de test :', error);
    process.exit(1);
  }
};
