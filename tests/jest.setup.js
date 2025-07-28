/**
 * @file Script de configuration globale pour Jest.
 * @module tests/jest.setup
 * @description
 * Exécuté une seule fois avant le lancement de toutes les suites de test, ce script prépare
 * la base de données de test de manière intelligente en s'adaptant à l'environnement d'exécution.
 *
 * En environnement local (`!isCI`):
 * 1. Se connecte au serveur PostgreSQL avec les privilèges d'administrateur (via POSTGRES_USER/PASSWORD).
 * 2. Détruit complètement l'ancienne base de données de test pour garantir un état propre.
 * 3. Crée une nouvelle base de données de test vide.
 *
 * En environnement d'Intégration Continue (`isCI`):
 * 1. Saute l'étape de création de la base de données, car celle-ci est supposée être déjà
 *    fournie par un service conteneurisé (comme défini dans le fichier `ci.yml`).
 *
 * Dans tous les environnements :
 * 1. Se connecte à la base de données de test.
 * 2. Active l'extension `pgcrypto` requise pour la génération d'UUID (`gen_random_uuid()`).
 * 3. Exécute les migrations de la base de données (`npm run migrate up`) pour construire le schéma.
 *
 * @requires dotenv - Pour charger les variables d'environnement depuis un fichier.env.
 * @requires pg - Le client PostgreSQL pour Node.js.
 * @requires child_process - Pour exécuter des commandes shell (migrations).
 */

import 'dotenv/config';
import logger from '../src/config/logger.js';
import { Client } from 'pg';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export default async () => {
    logger.info('\nSetting up test database...');

    // --- 1. Détection de l'environnement ---
    // La variable d'environnement CI est généralement définie sur 'true' par les plateformes d'intégration continue.
    const isCI = process.env.CI === 'true' ||!!process.env.CI;

    // --- 2. Configuration de la connexion ---
    // Permettent au script de se connecter avec des droits suffisants pour créer/détruire des bases de données.
    const dbName = 'geodiag_test_db';
    const adminConnectionConfig = {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        user: process.env.POSTGRES_USER,
        password: process.env.POSTGRES_PASSWORD,
        database: 'postgres', // Connexion à la BDD 'postgres' par défaut pour les opérations d'administration.
    };

    // --- 3. Création de la BDD (uniquement en local) ---
    if (!isCI) {
        const client = new Client(adminConnectionConfig);
        try {
            await client.connect();

            logger.info(`(Local) Dropping old test database '${dbName}' if it exists...`);
            await client.query(`DROP DATABASE IF EXISTS "${dbName}" WITH (FORCE);`);

            logger.info(`(Local) Creating new test database '${dbName}'...`);
            await client.query(`CREATE DATABASE "${dbName}";`);

            await client.end();
        } catch (error) {
            logger.error({ err: error }, "Failed to set up local test database. Please check your POSTGRES_USER and POSTGRES_PASSWORD environment variables in your.env file.");
            if (client &&!client.ended) await client.end();
            process.exit(1); // Arrête le processus de test en cas d'échec critique.
        }
    } else {
        logger.info('CI environment detected. Skipping database creation.');
    }

    // --- 4. Application des migrations (dans tous les environnements) ---
    try {
        logger.info('Running migrations on test database...');

        // La variable DATABASE_URL est la méthode standard pour passer les identifiants de connexion
        // aux outils comme node-pg-migrate. 
        const databaseUrl = process.env.DATABASE_URL;
        if (!databaseUrl) {
            throw new Error("DATABASE_URL environment variable is not set. It is required for running migrations.");
        }

        // Se connecter à la BDD de test pour y activer l'extension pgcrypto.
        const testDbClient = new Client({ connectionString: databaseUrl });
        await testDbClient.connect();
        logger.info('Enabling pgcrypto extension...');
        await testDbClient.query('CREATE EXTENSION IF NOT EXISTS pgcrypto;');
        await testDbClient.end();

        // Exécute la commande de migration en utilisant la DATABASE_URL.
        await execAsync('npm run migrate up', {
            env: {
              ...process.env,
                DATABASE_URL: databaseUrl,
            },
        });

        logger.info('Migrations completed successfully.');
    } catch (error) {
        logger.error({ err: error }, 'Failed to run migrations.');
        process.exit(1);
    }
};