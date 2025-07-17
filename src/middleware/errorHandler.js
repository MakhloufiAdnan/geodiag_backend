import logger from '../config/logger.js';

export function errorHandler(err, req, res, next) {
    
    logger.error({ 
        err, 
        stack: err.stack,
        url: req.originalUrl,
        method: req.method
    }, '--- GESTIONNAIRE D\'ERREURS ATTRAPÉ ---');
    
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Une erreur est survenue sur le serveur';

    res.status(statusCode).json({ message });
}