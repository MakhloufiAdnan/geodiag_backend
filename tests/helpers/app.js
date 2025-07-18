import express from 'express';
import allRoutes from '../../src/routes/index.js'; 
import { errorHandler } from '../../src/middleware/errorHandler.js';

/**
 * Crée et configure une instance de l'application Express pour les tests.
 * @returns {express.Application} L'instance de l'application Express.
 */
export const createTestApp = () => {
    const app = express();
    app.use(express.json());
    app.use('/api', allRoutes);
    app.use(errorHandler);
    return app;
}