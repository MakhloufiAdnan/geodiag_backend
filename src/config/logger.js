import pino from 'pino';

// Fonction de sérialisation des erreurs pour inclure la trace de pile.
// Cette fonction est appelée par Pino lorsqu'un objet est passé au logger sous la clé 'err'.
const errorSerializer = (err) => {
  if (err && typeof err === 'object') {
    return {
      type: err.constructor.name, // Ex: 'Error', 'TypeError', 'DatabaseError'
      message: err.message,
      stack: err.stack,
      statusCode: err.statusCode, // Si l'erreur a une propriété statusCode (comme les erreurs HTTP)
      // Vous pouvez ajouter d'autres propriétés spécifiques de l'erreur si elles sont utiles
    };
  }
  return err; // Retourne l'erreur telle quelle si elle n'est pas un objet ou est null/undefined
};

// Configure le logger principal de l'application.
const logger = pino({
  level: process.env.LOG_LEVEL || 'info', // Niveau de log par défaut, 'info' ou défini par env (ex: 'debug')

  // Le 'transport' détermine le format et la destination des logs.
  // En mode 'development', on utilise 'pino-pretty' pour une sortie lisible dans le terminal.
  // Pour les autres environnements (production, test en CI), on utilise le format JSON par défaut de Pino,
  // qui est facile à parser par les outils de log.
  transport:
    process.env.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true, // Active la coloration pour une meilleure lisibilité locale
            translateTime: 'SYS:dd-mm-yyyy HH:MM:ss', // Formate l'horodatage
            ignore: 'pid,hostname', // Cache des champs par défaut pour plus de clarté
          },
        }
      : undefined, // En 'production' ou 'test', le transport par défaut (JSON) est utilisé

  // 'serializers' permet de personnaliser la façon dont certains objets (comme les erreurs) sont logués.
  serializers: {
    err: errorSerializer, // Utilise notre fonction custom 'errorSerializer' pour la clé 'err'
    // Vous pouvez également ajouter des sérialiseurs pour 'req' et 'res' si vous loggez ces objets
  },
});

export default logger;
