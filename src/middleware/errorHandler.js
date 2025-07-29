import logger from '../config/logger.js';

/**
 * @function errorHandler
 * @description Middleware Express global pour attraper et formater toutes les erreurs.
 * @param {Error & {statusCode?: number}} err - L'objet erreur capturé.
 * @param {import('express').Request} req - L'objet requête Express.
 * @param {import('express').Response} res - L'objet réponse Express.
 * @param {import('express').NextFunction} next - La fonction next.
 */
export const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  const statusCode = err.statusCode || 500;
  const message =
    statusCode < 500 ? err.message : 'Une erreur inattendue est survenue.';

  const log = req.log || logger;

  log.error(
    {
      err: err,
      statusCode: statusCode,
      requestId: req.log ? req.log.bindings().requestId : undefined,
    },
    `Erreur ${statusCode} capturée par le gestionnaire.`
  );

  res.status(statusCode).json({ message });
};
