import 'dotenv/config';
import logger from '../src/config/logger.js';
import { Client } from 'pg';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * @file Script de configuration globale pour Jest.
 * @description Exécuté une seule fois avant toutes les suites de test.
 * Ce script prépare la base de données de test, y active les extensions
 * nécessaires, et démarre une instance unique du serveur Express.
 */
export default async () => {
  // ========================================================================
  //  PRÉPARATION DE LA BASE DE DONNÉES
  // ========================================================================
  logger.info('\nSetting up test database...');

  const dbName = 'geodiag_test_db';
  const connectionConfig = {
    host: 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: 'postgres',
  };

  const client = new Client(connectionConfig);

  try {
    await client.connect();

    logger.info(`Dropping old test database '${dbName}' if it exists...`);
    await client.query(`DROP DATABASE IF EXISTS "${dbName}" WITH (FORCE);`);

    logger.info(`Creating new test database '${dbName}'...`);
    await client.query(`CREATE DATABASE "${dbName}";`);

    // Se déconnecte du client 'postgres' pour se reconnecter à la nouvelle BDD
    await client.end();

    // Se connecte à la BDD de test pour y activer l'extension
    const testDbClient = new Client({ ...connectionConfig, database: dbName });
    await testDbClient.connect();
    logger.info('Enabling pgcrypto extension...');
    await testDbClient.query('CREATE EXTENSION IF NOT EXISTS pgcrypto;');
    await testDbClient.end();

    logger.info('Test database created and configured successfully.');
  } catch (error) {
    logger.error('Failed to set up test database:', error);
    if (client.connected) await client.end(); // S'assurer que le client est fermé en cas d'erreur
    process.exit(1);
  }

  try {
    logger.info('Running migrations on test database...');

    const connectionString = `postgres://${connectionConfig.user}:${connectionConfig.password}@${connectionConfig.host}:${connectionConfig.port}/${dbName}`;

    await execAsync('npm run migrate up', {
      env: {
        ...process.env,
        DATABASE_URL: connectionString,
      },
    });

    logger.info('Migrations completed successfully.');
  } catch (error) {
    console.error('Failed to run migrations:', error);
    process.exit(1);
  }
};
