import Redis from 'ioredis';
import logger from './logger.js';

const redisClient = new Redis(process.env.REDIS_URL, {
    
    // Permet à ioredis de réessayer la connexion
    maxRetriesPerRequest: null, 
});

redisClient.on('connect', () => {
    logger.info('✅ Connecté à Redis.');
});

redisClient.on('error', (err) => {
    logger.error({ err }, '❌ Erreur de connexion Redis.');
});

export default redisClient;