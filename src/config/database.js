import express from 'express';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    ssl: {
        rejectUnauthorized: false
    }
};

const pool = new pg.Pool(dbConfig);

// --- Création du serveur Express ---
const app = express();
const PORT = process.env.PORT || 10000; // Render fournit la variable PORT

// --- Route pour le Health Check ---
app.get('/', (req, res) => {
    res.status(200).send('API Geodiag is running. 🎉');
});

// --- Route de test pour la connexion à la BDD ---
app.get('/db-test', async (req, res) => {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT NOW()'); // Une simple requête de test
        res.status(200).json({
            message: 'Database connection successful!',
            time: result.rows[0].now,
        });
        client.release(); // Permet de ibérer le client
    } catch (error) {
        console.error('Database connection test failed:', error);
        res.status(500).send('Failed to connect to the database.');
    }
});

// --- Démarrage du serveur ---
app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
    pool.query('SELECT NOW()', (err, res) => {
        if (err) {
            console.error('Initial database connection failed!', err);
        } else {
            console.log('Successfully connected to the database on startup.');
        }
    });
});