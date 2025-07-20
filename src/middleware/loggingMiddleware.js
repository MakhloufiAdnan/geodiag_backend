import { v4 as uuidv4 } from 'uuid';
import logger from '../config/logger.js';

/**
 * Middleware pour injecter un logger contextuel dans chaque requête.
 * Chaque log généré durant la vie de la requête portera le même `requestId`.
 */
export const requestLogger = (req, res, next) => {
    const requestId = req.headers['x-request-id'] || uuidv4();
    
    // Crée un logger enfant avec le contexte de la requête
    req.log = logger.child({ 
        requestId,
        ip: req.ip,
        method: req.method,
        url: req.originalUrl,
    });
    
    // Log de la réception de la requête
    req.log.info('Requête reçue');

    next();
};