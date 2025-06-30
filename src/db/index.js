import pg from 'pg'; 
import dbConfig from '../config/database.js';

// Utilisation de Pool du module pg
const pool = new pg.Pool(dbConfig);

// J'exporte directement la fonction query
export function query(text, params) {
    return pool.query(text, params);
}