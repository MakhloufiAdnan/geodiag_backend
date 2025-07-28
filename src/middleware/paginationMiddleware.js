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
 * 1.  **Valide** que `page` et `limit`, s'ils sont fournis, sont des nombres entiers positifs.
 * Si la validation échoue, il rejette la requête avec un statut HTTP 400.
 * 2.  **Sécurise** la requête en imposant une limite maximale (`maxLimit`) pour prévenir les abus
 * et les risques de déni de service (DoS) sur la base de données.
 * 3.  **Calcule** les valeurs de pagination (`page`, `limit`, `offset`) et les attache à l'objet
 * `req.pagination` pour une utilisation facile dans les couches de service et de repository.
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
    const pageAsInt = parseInt(req.query.page, 10);
    const limitAsInt = parseInt(req.query.limit, 10);

    // --- 1. Validation des entrées ---

    // Si le paramètre 'page' est fourni, il doit être un entier positif.
    if (req.query.page && (isNaN(pageAsInt) || pageAsInt < 1)) {
      return res.status(400).json({
        message: "Le paramètre 'page' doit être un nombre entier positif.",
      });
    }

    // Si le paramètre 'limit' est fourni, il doit être un entier positif.
    if (req.query.limit && (isNaN(limitAsInt) || limitAsInt < 1)) {
      return res.status(400).json({
        message: "Le paramètre 'limit' doit être un nombre entier positif.",
      });
    }

    // --- 2. Application des valeurs par défaut et sécurisation ---

    // Appliquer les valeurs par défaut si les paramètres ne sont pas fournis ou invalides.
    const page = pageAsInt || 1;
    const limitInput = limitAsInt || defaultLimit;

    // Imposer la limite maximale pour protéger le service contre les requêtes excessives.
    const limit = Math.min(limitInput, maxLimit);

    // --- 3. Ajout des données de pagination à la requête ---

    // Attacher l'objet de pagination finalisé pour une utilisation ultérieure.
    req.pagination = {
      page,
      limit,
      offset: (page - 1) * limit,
    };

    next();
  };
