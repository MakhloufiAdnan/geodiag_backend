import express from 'express';
import http from 'http';
import cookieParser from 'cookie-parser'; 
import allRoutes from '../../src/routes/index.js'; 
import { errorHandler } from '../../src/middleware/errorHandler.js';
import { requestLogger } from '../../src/middleware/loggingMiddleware.js';

/**
 * Crée et configure une instance de l'application Express ET un serveur HTTP pour les tests.
 * @returns {{app: express.Application, server: http.Server}} Un objet contenant l'app et le serveur.
 */
export const createTestApp = () => {
    const app = express();

    // Ajoute le middleware cookie-parser pour que req.cookies soit disponible
    app.use(cookieParser());
    
    app.use(requestLogger);
    app.use(express.json());
    app.use('/api', allRoutes);
    app.use(errorHandler);

    const server = http.createServer(app);

    return { app, server };
};
