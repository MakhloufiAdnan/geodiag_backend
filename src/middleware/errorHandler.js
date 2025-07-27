import logger from "../config/logger.js";

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

  // Si err.statusCode existe, on l'utilise, sinon 500 par défaut.
  const statusCode = err.statusCode || 500;
  const message =
    statusCode < 500 ? err.message : "Une erreur inattendue est survenue.";

  // Log l'erreur (sauf en environnement de test pour garder une sortie propre).
  if (process.env.NODE_ENV !== "test") {
    const log = req.log || logger;
    log.error("--- GESTIONNAIRE D'ERREURS ATTRAPÉ ---", {
      err: {
        type: err.constructor.name,
        message: err.message,
        stack: err.stack,
        statusCode: statusCode, // Log le code statut final.
      },
    });
  }

  // Envoie la réponse finale et formatée au client.
  res.status(statusCode).json({ message });
};
