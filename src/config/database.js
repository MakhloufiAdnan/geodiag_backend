import dotenv from 'dotenv';
dotenv.config();

// Détecte si l'application s'exécute dans l'environnement de test
const isTestEnvironment = process.env.NODE_ENV === 'test';

/**
 * @description Configuration de la base de données qui s'adapte à l'environnement.
 * - En mode 'test', il se connecte à la base de données de test sur localhost.
 * - Sinon, il utilise les variables d'environnement pour la production/développement.
 */
const dbConfig = {
  host: isTestEnvironment ? 'localhost' : process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: isTestEnvironment ? 'geodiag_test' : process.env.DB_DATABASE,
};

export default dbConfig;
