import 'dotenv/config'; 
import { Client } from 'pg';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Ce script est exécuté une seule fois avant le lancement de toutes les suites de test.
 * Il s'assure que la base de données de test existe et est à jour avec le dernier schéma.
 */
export default async () => {
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
};
