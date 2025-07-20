/**
 * Middleware pour parser les paramètres de pagination `page` et `limit` de la query string.
 * Attache un objet `req.pagination` à la requête avec les valeurs calculées.
 * @param {number} [defaultLimit=10] - La limite par défaut si non fournie.
 */
export const parsePagination = (defaultLimit = 10) => (req, res, next) => {
    
    // Utilise l'opérateur "OU" pour fournir une valeur par défaut si le parsing échoue (NaN) ou si la valeur est 0.
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || defaultLimit;

    // Attache l'objet de pagination à la requête pour une utilisation ultérieure
    req.pagination = {
        page,
        limit,
        offset: (page - 1) * limit
    };
    
    next();
};