/**
 * @file Script de configuration globale pour Jest.
 * @description Exécuté une seule fois avant toutes les suites de test. Ce script
 * s'assure que la base de données de test existe, la crée si nécessaire, puis
 * applique les migrations pour garantir un environnement de test propre et prêt.
 */
import 'dotenv/config';
import pg from 'pg';
import { exec } from 'child_process';
import { promisify } from 'util';
import logger from '../src/config/logger.js';

const execAsync = promisify(exec);

/**
 * Analyse l'URL de la base de données pour extraire les informations de connexion
 * et le nom de la base de données de test.
 * @returns {{connectionConfig: object, dbName: string}}
 */
const getDbConfig = () => {
  const dbUrl = new URL(process.env.DATABASE_URL);
  const dbName = dbUrl.pathname.slice(1); // Retire le '/' initial

  const connectionConfig = {
    user: dbUrl.username,
    password: dbUrl.password,
    host: dbUrl.hostname,
    port: dbUrl.port,
  };

  return { connectionConfig, dbName };
};

export default async () => {
  logger.info("\nConfiguration de l'environnement de test...");

  if (!process.env.DATABASE_URL) {
    logger.error(
      "FATAL : La variable d'environnement DATABASE_URL n'est pas définie."
    );
    process.exit(1);
  }

  const { connectionConfig, dbName } = getDbConfig();

  // Se connecter à la base de données de maintenance par défaut ('postgres')
  const client = new pg.Client({ ...connectionConfig, database: 'postgres' });

  try {
    await client.connect();
    logger.info('Connecté à la base de données de maintenance.');

    // Vérifier si la base de données de test existe
    const res = await client.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [dbName]
    );

    if (res.rowCount === 0) {
      // La base de données n'existe pas, la créer
      logger.warn(
        `La base de données de test "${dbName}" n'existe pas. Création en cours...`
      );
      await client.query(`CREATE DATABASE "${dbName}"`);
      logger.info(`Base de données "${dbName}" créée avec succès.`);
    } else {
      logger.info(`La base de données de test "${dbName}" existe déjà.`);
    }
  } catch (error) {
    logger.error(
      { err: error },
      'Erreur lors de la vérification/création de la base de données de test.'
    );
    process.exit(1);
  } finally {
    await client.end();
  }

  // Maintenant que la base de données existe, lancer les migrations
  try {
    logger.info('Exécution des migrations sur la base de données de test...');
    await execAsync('npm run migrate up');
    logger.info(
      'Migrations terminées avec succès. La base de données de test est prête.'
    );
  } catch (error) {
    logger.error(
      {
        message: "Échec de l'exécution des migrations.",
        stdout: error.stdout,
        stderr: error.stderr,
        err: error,
      },
      'Erreur détaillée de la migration :'
    );
    process.exit(1);
  }
};
