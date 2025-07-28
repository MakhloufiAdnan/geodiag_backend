import { BadRequestException } from '../exceptions/apiException.js';

/**
 * @file Middleware pour parser et valider les paramètres de pagination.
 * @module middleware/paginationMiddleware
 */

/**
 * Crée un middleware Express pour parser, valider et sécuriser les paramètres de pagination (`page` et `limit`)
 * à partir de la query string d'une requête.
 *
 * @description
 * Ce middleware effectue les actions suivantes :
 * 1.  **Valide** que `page` et `limit`, s'ils sont fournis, sont des nombres entiers positifs.
 *     Si la validation échoue, il transmet une `BadRequestException` au gestionnaire d'erreurs central.
 * 2.  **Sécurise** la requête en imposant une limite maximale (`maxLimit`) pour prévenir les abus
 *     et les risques de déni de service (DoS) sur la base de données.
 * 3.  **Calcule** les valeurs de pagination (`page`, `limit`, `offset`) et les attache à l'objet
 *     `req.pagination` pour une utilisation facile dans les couches de service et de repository.
 *
 * @param {number} [defaultLimit=10] - La limite par défaut à appliquer si le paramètre `limit` n'est pas fourni.
 * @param {number} [maxLimit=100] - La limite maximale autorisée pour une seule requête.
 * @returns {import('express').RequestHandler} Le middleware Express configuré.
 *
 * @example
 * // Utilisation dans une route Express pour une pagination par défaut de 15 et un maximum de 50
 * router.get('/users', parsePagination(15, 50), userController.getAllUsers);
 */
export const parsePagination =
  (defaultLimit = 10, maxLimit = 100) =>
  (req, res, next) => {
    const { page: pageQuery, limit: limitQuery } = req.query;

    let page = 1; // Valeur par défaut pour la page
    let limit = defaultLimit; // Valeur par défaut pour la limite

    // --- 1. Validation des entrées utilisateur ---

    if (pageQuery) {
      const parsedPage = parseInt(pageQuery, 10);
      // Si la valeur n'est pas un nombre ou est inférieure à 1, c'est une erreur.
      if (isNaN(parsedPage) || parsedPage < 1) {
        return next(
          new BadRequestException(
            "Le paramètre 'page' doit être un nombre entier positif."
          )
        );
      }
      page = parsedPage;
    }

    if (limitQuery) {
      const parsedLimit = parseInt(limitQuery, 10);
      // Si la valeur n'est pas un nombre ou est inférieure à 1, c'est une erreur.
      if (isNaN(parsedLimit) || parsedLimit < 1) {
        return next(
          new BadRequestException(
            "Le paramètre 'limit' doit être un nombre entier positif."
          )
        );
      }
      limit = parsedLimit;
    }

    // --- 2. Sécurisation ---

    // Imposer la limite maximale pour protéger le service.
    const finalLimit = Math.min(limit, maxLimit);

    // --- 3. Ajout des données de pagination à la requête ---

    req.pagination = {
      page,
      limit: finalLimit,
      offset: (page - 1) * finalLimit,
    };

    next();
  };
