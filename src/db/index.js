/**
 * @file Point d'entrée pour la connexion à la base de données.
 * @description Ce module initialise et exporte le pool de connexions PostgreSQL.
 * Il utilise une configuration unique qui s'adapte à l'environnement (test, dev, prod).
 */
import pg from 'pg';
import dbConfig from '../config/database.js';

let finalConfig = dbConfig;

if (process.env.NODE_ENV === 'test' && process.env.DATABASE_URL) {
  finalConfig = { connectionString: process.env.DATABASE_URL };
}

/**
 * @description Pool de connexions PostgreSQL.
 * Utilise la configuration finale déterminée ci-dessus.
 * @type {pg.Pool}
 */
const pool = new pg.Pool(finalConfig);

/**
 * @description Objet utilitaire pour exécuter des requêtes simples.
 */
export const db = {
  query: (text, params) => pool.query(text, params),
};

// Exportation nommée du pool pour un contrôle plus fin (transactions, etc.)
export { pool };
