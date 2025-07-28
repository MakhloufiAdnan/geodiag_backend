import 'dotenv/config';
import logger from '../src/config/logger.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * @file Script de configuration globale pour Jest.
 * @description Exécuté une seule fois avant toutes les suites de test. Ce script
 * applique les migrations à la base de données de test fournie par l'environnement.
 */
export default async () => {
  logger.info("\nConfiguration de l'environnement de test...");

  // Variable d'environnement DATABASE_URL
  if (!process.env.DATABASE_URL) {
    logger.error(
      "FATAL : La variable d'environnement DATABASE_URL n'est pas définie."
    );
    process.exit(1);
  }

  try {
    logger.info('Exécution des migrations sur la base de données de test...');

    // Le script de migration ('npm run migrate up') utilisera la DATABASE_URL
    // de process.env pour se connecter à la base de données.
    await execAsync('npm run migrate up', {
      env: {
        ...process.env,
      },
    });

    logger.info(
      'Migrations terminées avec succès. La base de données de test est prête.'
    );
  } catch (error) {
    logger.error("Échec de l'exécution des migrations :", error);
    // Quitte avec un code d'erreur pour faire échouer l'exécution des tests
    process.exit(1);
  }
};
