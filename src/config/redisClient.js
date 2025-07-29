import Redis from 'ioredis';
import logger from './logger.js';

// Détermine l'URL de Redis en fonction de l'environnement
const redisUrl =
  process.env.NODE_ENV === 'test'
    ? 'redis://localhost:6379' // Pour les tests locaux, se connecte à localhost
    : process.env.REDIS_URL; // Pour Docker, utilise le nom du service 'redis'

const redisClient = new Redis(redisUrl, {
  // Permet à ioredis de réessayer la connexion en cas de problème temporaire
  maxRetriesPerRequest: null,
});

redisClient.on('connect', () => {
  logger.info('✅ Connecté à Redis.');
});

redisClient.on('error', (err) => {
  logger.error({ err }, '❌ Erreur de connexion Redis.');
});

export default redisClient;
