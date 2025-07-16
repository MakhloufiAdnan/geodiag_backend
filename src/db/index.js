import pg from 'pg';
import devConfig from '../config/database.js';
import testConfig from '../config/testDatabase.js';

let config;

if (process.env.NODE_ENV === 'test') {

    // Priorité à DATABASE_URL pour le CI/CD
    if (process.env.DATABASE_URL) {
        config = { connectionString: process.env.DATABASE_URL };
    } else {

    // Sinon, utilise la configuration locale pour les tests
        config = testConfig;
    }
} else {
    
    // Configuration pour le développement ou la production
    config = devConfig;
}

// Création du pool de connexions
const pool = new pg.Pool(config);

// Exportation de l'objet 'db' pour les requêtes simples (optionnel)
export const db = {
    query: (text, params) => pool.query(text, params),
};

// Exportation nommée du pool pour un contrôle plus fin (transactions, etc.)
export { pool };
