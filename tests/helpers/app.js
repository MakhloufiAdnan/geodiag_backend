import express from 'express';
import http from 'http';
import allRoutes from '../../src/routes/index.js'; 
import { errorHandler } from '../../src/middleware/errorHandler.js';

/**
 * Crée et configure une instance de l'application Express ET un serveur HTTP pour les tests.
 * @returns {{app: express.Application, server: http.Server}} Un objet contenant l'app et le serveur.
 */
export const createTestApp = () => {
    const app = express();
    app.use(express.json());
    app.use('/api', allRoutes);
    app.use(errorHandler);

    // Créer un serveur HTTP à partir de l'application Express
    const server = http.createServer(app);

    // Retourner à la fois l'application (pour supertest) et le serveur (pour le fermer)
    return { app, server };
};