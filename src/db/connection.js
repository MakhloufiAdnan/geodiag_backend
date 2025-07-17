import { pool } from './index.js';

/**
 * Tente d'établir une connexion à la base de données pour vérifier
 * que les identifiants et l'accessibilité sont corrects.
 * Si la connexion échoue, une erreur sera levée.
 */
export async function checkDatabaseConnection() {
    let client;
    try {
        // Demande une connexion au pool
        client = await pool.connect();

        // Exécute une requête simple et rapide pour confirmer la connexion
        await client.query('SELECT NOW()');
        logger.info('✅ Connexion à la base de données réussie.');
    } catch (error) {
        logger.error('❌ Échec de la connexion à la base de données :', error.message);

        // Relance l'erreur pour que le processus de démarrage puisse l'attraper et s'arrêter
        throw error;
    } finally {
        // Libère la connexion pour qu'elle retourne dans le pool
        if (client) {
            client.release();
        }
    }
}