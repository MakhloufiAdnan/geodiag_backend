import Joi from "joi";
import { validate } from "../middleware/validationMiddleware.js";

/**
 * @file Définit les schémas de validation pour les routes des compagnies.
 */
const createCompanySchema = Joi.object({
  name: Joi.string().min(2).max(255).required().messages({
    "string.base": `"name" doit être une chaîne de caractères.`,
    "string.empty": `"name" ne peut pas être vide.`,
    "string.min": `"name" doit avoir une longueur minimale de {#limit} caractères.`,
    "any.required": `"name" est un champ obligatoire.`,
  }),
  address: Joi.string().optional().allow("").messages({
    "string.base": `"address" doit être une chaîne de caractères.`,
  }),
  email: Joi.string().email().required().messages({
    "string.email": `"email" doit être une adresse email valide.`,
    "any.required": `"email" est un champ obligatoire.`,
  }),
  phone_number: Joi.string().optional().allow("").messages({
    "string.base": `"phone_number" doit être une chaîne de caractères.`,
  }),
});

export const validateCompanyCreation = validate(createCompanySchema);
