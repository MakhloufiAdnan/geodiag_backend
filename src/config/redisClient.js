import Redis from 'ioredis';
import logger from './logger.js';

const redisUrl = process.env.NODE_ENV === 'test'
  ? 'redis://localhost:6379' // Pour les tests locaux
  : process.env.REDIS_URL;   // Pour la production (Upstash)

// Stratégie de reconnexion (Exponential Backoff)
const retryStrategy = (times) => {
  const delay = Math.min(times * 50, 2000);
  logger.warn(`Tentative de reconnexion à Redis dans ${delay}ms (essai n°${times})`);
  return delay;
};

// Configuration de la connexion
const redisOptions = {
  retryStrategy,
};

// Active l'option TLS que si l'URL est sécurisée (commence par "rediss://")
if (redisUrl?.startsWith('rediss://')) { 
redisOptions.tls = {};
}

const redisClient = new Redis(redisUrl, redisOptions);

redisClient.on('connect', () => { 
logger.info('✅Connected to Redis.');
});

redisClient.on('error', (err) => { 
if (err.code !== 'ECONNRESET') { 
logger.error({ err }, '❌ Redis connection error.'); 
}
});

export default redisClient;
