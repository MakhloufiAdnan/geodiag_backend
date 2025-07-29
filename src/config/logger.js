import pino from 'pino';

// Configure le logger pour qu'il soit lisible en développement (pino-pretty),
// et au format JSON standard en production et en TEST pour la CI.
const logger = pino({
  level: process.env.LOG_LEVEL || 'info', // Niveau de log par défaut (ex: 'info', 'debug')
  // Définir le transport en fonction de l'environnement
  transport:
    // En mode 'development' local, utiliser pino-pretty pour une sortie colorée et lisible
    process.env.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true, // Active la coloration dans le terminal
            translateTime: 'SYS:dd-mm-yyyy HH:MM:ss', // Formate l'heure de manière lisible
            ignore: 'pid,hostname', // Cache des champs par défaut pour plus de clarté
          },
        }
      : // Pour tous les autres environnements (production, test en CI),
        // pino générera du JSON par défaut. Le format JSON est idéal pour
        // les systèmes de CI et les agrégateurs de logs.
        undefined,
});

export default logger;