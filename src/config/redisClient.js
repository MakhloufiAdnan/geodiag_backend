import Redis from 'ioredis';
import logger from './logger.js';

// Détermine l'URL de Redis en fonction de l'environnement
const redisUrl =
  process.env.NODE_ENV === 'test'
    ? 'redis://localhost:6379' // Pour les tests locaux, se connecte à localhost
    : process.env.REDIS_URL;

// Stratégie de reconnexion (Exponential Backoff)
const retryStrategy = (times) => {
  
  // Attendre de plus en plus longtemps entre chaque tentative, avec un maximum de 2 secondes.
  const delay = Math.min(times * 50, 2000);
  logger.warn(`Tentative de reconnexion à Redis dans ${delay}ms (essai n°${times})`);
  return delay;
};

const redisClient = new Redis(redisUrl, {
  retryStrategy,
  // Ajout d'une option TLS nécessaire pour les connexions rediss://
  // Ioredis le fait souvent automatiquement, mais l'expliciter est plus robuste.
  tls: {},
});

redisClient.on('connect', () => {
  logger.info('✅ Connecté à Redis.');
});

redisClient.on('error', (err) => {
  if (err.code !== 'ECONNRESET') {
    logger.error({ err }, '❌ Erreur de connexion Redis.');
  }
});

export default redisClient;
