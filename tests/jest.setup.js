import 'dotenv/config';
import logger from '../src/config/logger.js';
import { Client } from 'pg';
import { exec } from 'child_process';
import { promisify } from 'util';
import { createTestApp } from './helpers/app.js';
import { testState } from './global.js';

const execAsync = promisify(exec);

/**
 * @file Script de configuration globale pour Jest.
 * @description Exécuté une seule fois avant toutes les suites de test.
 * Ce script prépare la base de données de test et démarre une instance unique
 * du serveur Express qui sera utilisée par tous les tests d'intégration.
 */
export default async () => {
    
    // ========================================================================
    // ==            ÉTAPE 1 : PRÉPARATION DE LA BASE DE DONNÉES             ==
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
        
        logger.info('Test database created successfully.');
    } catch (error) {
        logger.error('Failed to set up test database:', error);
        process.exit(1);
    } finally {
        await client.end();
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

    // ========================================================================
    // ==          ÉTAPE 2 : DÉMARRAGE DU SERVEUR DE TEST GLOBAL             ==
    // ========================================================================
    logger.info('Starting global test server...');
    const { app, server } = createTestApp();

    // Stocke les instances du serveur et de l'app pour pouvoir les fermer dans le teardown
    testState.app = app;
    testState.server = server;

    // Expose l'instance de l'app comme une variable globale pour un accès facile dans les tests
    global.testApp = app;
    logger.info('Global test server started successfully.');
};