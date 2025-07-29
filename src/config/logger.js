import pino from 'pino';

/**
 * @function errorSerializer
 * @description Sérialiseur personnalisé pour les objets Error, incluant la pile d'appels.
 * @param {Error} err - L'objet erreur à sérialiser.
 * @returns {object|Error} Objet sérialisé ou l'erreur originale.
 */
const errorSerializer = (err) => {
  if (err && typeof err === 'object') {
    return {
      type: err.constructor.name,
      message: err.message,
      stack: err.stack,
      statusCode: err.statusCode,
    };
  }
  return err;
};

/**
 * @constant {PinoLogger} logger
 * @description Configure l'instance principale du logger Pino.
 */
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport:
    process.env.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:dd-mm-yyyy HH:MM:ss',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
  serializers: {
    err: errorSerializer,
  },
});

export default logger;
