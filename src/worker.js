import PgBoss from 'pg-boss';
import 'dotenv/config'; // Pour charger les variables d'environnement (ex: DATABASE_URL)
import paymentJobHandler from './jobs/paymentJobHandler.js';
import dbConfig from './config/database.js';

/**
 * @file Point d'entrée du processus worker.
 * @description Initialise pg-boss, s'abonne aux types de tâches et démarre le traitement.
 */
const boss = new PgBoss(dbConfig);

async function startWorker() {
    // pg-boss s'assure que les tables nécessaires existent dans le schéma 'public'
    await boss.start();
    console.log('Boss started. Worker is ready to process jobs.');

    // Configuration pour notre type de tâche spécifique
    const jobTypeName = 'process_successful_payment';
    const workerOptions = {
        // Traiter une seule tâche à la fois pour ce type.
        // Augmenter pour plus de parallélisme si nécessaire.
        teamSize: 1, 
        teamConcurrency: 1, 
    };

    // Le worker s'abonne aux tâches de ce type et les exécute avec le handler fourni.
    // pg-boss gère automatiquement les tentatives en cas d'échec du handler.
    await boss.work(jobTypeName, workerOptions, paymentJobHandler);
    
    console.log(`Worker subscribed to '${jobTypeName}' jobs.`);
}

startWorker().catch(error => {
    console.error('❌ Failed to start the worker:', error);
    process.exit(1);
});

// Assure un arrêt propre du worker
const gracefulShutdown = async () => {
    console.log('Worker shutting down gracefully...');
    await boss.stop();
    process.exit(0);
};

process.on('SIGINT', gracefulShutdown); // Ctrl+C
process.on('SIGTERM', gracefulShutdown); // Arrêt par le système (ex: Docker, Kubernetes)