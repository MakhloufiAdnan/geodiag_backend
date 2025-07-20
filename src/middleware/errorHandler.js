import globalLogger from '../config/logger.js';

export function errorHandler(err, req, res, next) {
    
    // Utilise req.log qui contient déjà le contexte (requestId, url, etc.)
    // Si req.log n'existe pas (erreur très précoce), on utilise le logger global par sécurité.
    const logger = req.log || globalLogger;

    logger.error({ 
        err, 
        stack: err.stack,
    }, '--- GESTIONNAIRE D\'ERREURS ATTRAPÉ ---');
    
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Une erreur est survenue sur le serveur';

    res.status(statusCode).json({ message });
}