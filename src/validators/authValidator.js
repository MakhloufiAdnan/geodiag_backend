import Joi from 'joi';
import { validate } from '../middleware/validationMiddleware.js';

/**
 * @file Définit les schémas de validation pour les routes d'authentification.
 */

// Schéma pour valider les données de connexion (email et mot de passe).
const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': `"email" doit être une adresse email valide`,
    'any.required': `"email" est un champ obligatoire`,
  }),
  password: Joi.string().required().messages({
    'string.empty': `"password" ne peut pas être vide`,
    'any.required': `"password" est un champ obligatoire`,
  }),
});

// Exporte directement le middleware de validation prêt à l'emploi.
export const validateLogin = validate(loginSchema);
