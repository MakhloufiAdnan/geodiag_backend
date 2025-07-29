import logger from '../config/logger.js';

/**
 * Middleware Express pour attraper et formater toutes les erreurs de manière robuste.
 * @param {Error & {statusCode?: number}} err L'objet erreur, potentiellement avec un statusCode.
 * @param {import('express').Request} req L'objet requête Express.
 * @param {import('express').Response} res L'objet réponse Express.
 * @param {import('express').NextFunction} next La fonction next.
 */
export const errorHandler = (err, req, res, next) => {
  // Si les en-têtes ont déjà été envoyés, on passe l'erreur au gestionnaire d'erreurs suivant (Express par défaut).
  if (res.headersSent) {
    return next(err);
  }

  // Détermine le code de statut HTTP et le message de l'erreur.
  const statusCode = err.statusCode || 500;
  // Le message est plus générique pour les erreurs serveur (5xx) en production.
  const message =
    statusCode < 500 ? err.message : 'Une erreur inattendue est survenue.';

  // Utilise le logger attaché à la requête (si disponible) ou le logger global.
  const log = req.log || logger;

  // Journaliser l'erreur pour le débogage en environnement de test ---
  // En environnement de TEST, on veut TOUJOURS voir les détails de l'erreur, y compris la trace de pile.
  // Le sérialiseur 'err' de Pino (configuré dans logger.js) va traiter l'objet 'err' ici.
  if (process.env.NODE_ENV === 'test') {
    log.error(
      {
        err: err, // Passe l'objet Error complet pour que le sérialiseur de Pino puisse extraire la stack
        statusCode: statusCode,
        requestId: req.log ? req.log.bindings().requestId : 'N/A', // ID de requête pour le contexte
      },
      '--- ERREUR TEST CAPTURÉE (DEBUG) ---' // Message de log
    );
  } else {
    // Pour les autres environnements (développement, production), journaliser l'erreur.
    // La stack sera incluse ou non selon la configuration du logger.js (transport et serializers).
    log.error(
      {
        err: err,
        statusCode: statusCode,
        requestId: req.log ? req.log.bindings().requestId : 'N/A',
      },
      "--- GESTIONNAIRE D'ERREURS ATTRAPÉ ---"
    );
  }

  // Envoie la réponse finale et formatée au client.
  res.status(statusCode).json({ message });
};
