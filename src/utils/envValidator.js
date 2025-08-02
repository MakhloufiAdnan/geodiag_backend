import Joi from 'joi';
import logger from '../config/logger.js';

/**
 * @file Valide les variables d'environnement critiques au démarrage de l'application.
 * @description Utilise une approche "fail-fast" : si une variable essentielle est manquante
 * ou a un format incorrect, le processus est arrêté avec un message d'erreur explicite.
 */

/**
 * Valide l'objet `process.env` contre un schéma Joi prédéfini et strict.
 * @throws {Error} Lance une erreur et arrête l'application si la validation échoue.
 */
export const validateEnv = () => {
  const schema = Joi.object({
    // --- Configuration Générale ---
    NODE_ENV: Joi.string()
      .valid('development', 'production', 'test')
      .required(),
    PORT: Joi.number().port().required(), // Valide que c'est un port réseau valide (0-65535)

    // --- Connexions Externes ---
    DATABASE_URL: Joi.string().uri().required(), // Valide que c'est une URI (ex: postgresql://...)
    REDIS_URL: Joi.string().uri().required(), // Valide que c'est une URI (ex: redis://...)

    // --- Secrets d'Authentification (avec contraintes de sécurité) ---
    JWT_ACCESS_SECRET: Joi.string().min(32).required(), // Exige une longueur minimale pour la sécurité
    JWT_REFRESH_SECRET: Joi.string().min(32).required(), // Exige une longueur minimale pour la sécurité

    // --- Durées d'Expiration des Jetons ---
    JWT_EXPIRATION: Joi.string().required(),
    JWT_REFRESH_EXPIRATION: Joi.string().required(),

    // --- Secrets des Services Tiers (avec format spécifique) ---
    STRIPE_SECRET_KEY: Joi.string()
      .pattern(/^sk_(test|live)_/)
      .required(), // Valide le préfixe des clés secrètes Stripe
    STRIPE_WEBHOOK_SECRET: Joi.string()
      .pattern(/^whsec_/)
      .required(), // Valide le préfixe des secrets de webhook Stripe

    // --- URLs ---
    FRONTEND_URL: Joi.string().uri().required(),
  }).unknown(); // .unknown() autorise les autres variables d'environnement non listées ici

  const { error } = schema.validate(process.env);

  if (error) {
    // Si une erreur est trouvée, on logue le détail et on arrête tout.
    logger.fatal(
      `🔥 Erreur de validation de la configuration: ${error.message}`
    );
    process.exit(1);
  } else {
    // Message de succès pour confirmer que tout est en ordre au démarrage.
    logger.info("✅ Configuration de l'environnement validée.");
  }
};
