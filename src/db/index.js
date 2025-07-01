import pg from 'pg';
import testConfig from '../config/testDatabase.js';
import devConfig from '../config/database.js';

// Sélection de la configuration en fonction de l'environnement
const config = process.env.NODE_ENV === 'test' ? testConfig : devConfig;

// Utilisation de Pool du module pg
const pool = new pg.Pool(config);

// J'exporte directement l'objet db qui contient la fonction query
export const db = {
    query: (text, params) => pool.query(text, params),
};

export { pool }; 