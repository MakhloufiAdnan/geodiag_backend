/**
 * Middleware de validation générique
 * @param {Joi.Schema} schema - Le schéma Joi à utiliser pour la validation.
 * @param {string} property - La propriété de l'objet 'req' à valider ('body', 'params', ou 'query').
 * @returns Un middleware Express.
 */
export const validate =
  (schema, property = "body") =>
  (req, res, next) => {
    // Valide la propriété de la requête spécifiée (req.body par défaut)
    const { error } = schema.validate(req[property]);

    if (error) {
      // Renvoie une erreur 400 avec le message détaillé
      return res.status(400).json({ message: error.details[0].message });
    }

    // Passe au prochain middleware si la validation est réussie
    next();
  };
