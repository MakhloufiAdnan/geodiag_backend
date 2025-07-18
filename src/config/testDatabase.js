// création d'une base de données de test pour Geodiag
import dotenv from 'dotenv';
dotenv.config();

const dbConfig = {
    host: 'localhost',
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: 'geodiag_test_db',
};
export default dbConfig;