import logger from '../config/logger.js';

/**
 * @description Middleware Express pour attraper et formater toutes les erreurs de manière robuste.
 * @param {Error & {statusCode?: number}} err L'objet erreur, potentiellement avec un statusCode.
 * @param {import('express').Request} req L'objet requête Express.
 * @param {import('express').Response} res L'objet réponse Express.
 * @param {import('express').NextFunction} next La fonction next.
 */
export const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  const statusCode = err.statusCode || 500;
  // Le message est générique pour les erreurs 5xx en production, plus spécifique sinon
  const message =
    statusCode < 500 ? err.message : 'Une erreur inattendue est survenue.';

  // Récupère le logger de requête si disponible, sinon le logger global
  const log = req.log || logger; 

  // --- MODIFICATION ICI : Journaliser l'erreur et la stack TRACE MÊME EN MODE TEST ---
  // En environnement de TEST, on veut TOUJOURS voir la stack trace pour le débogage.
  // En dehors du mode test, on suit la logique de log standard (sans stack trace en production par défaut)
  if (process.env.NODE_ENV === 'test') {
    log.error("--- ERREUR TEST CAPTURÉE (DEBUG) ---", {
      type: err.constructor.name, // Nom du constructeur de l'erreur (ex: 'TypeError')
      message: err.message,       // Message de l'erreur
      stack: err.stack,           // LA TRACE DE PILE, cruciale pour le débogage
      statusCode: statusCode,     // Code de statut HTTP de l'erreur
      requestId: req.log ? req.log.bindings().requestId : 'N/A' // Si le logger de requête est dispo
    });
  } else {
    // Log normal pour les autres environnements (développement, production)
    log.error("--- GESTIONNAIRE D'ERREURS ATTRAPÉ ---", {
      err: {
        type: err.constructor.name,
        message: err.message,
        // En prod/dev, vous pourriez choisir d'inclure la stack ou non, selon la politique de sécurité
        // Pour l'instant, elle n'est incluse que si NODE_ENV n'est pas 'test' et pas 'production' via la config du logger
        stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined, 
        statusCode: statusCode,
      },
      requestId: req.log ? req.log.bindings().requestId : 'N/A'
    });
  }
  // --- FIN DE LA MODIFICATION ---

  // Envoie la réponse finale et formatée au client.
  res.status(statusCode).json({ message });
};