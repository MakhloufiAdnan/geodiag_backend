import Joi from 'joi';
import { validate } from '../middleware/validationMiddleware.js';

// Schéma pour la création d'une entreprise.
const createCompanySchema = Joi.object({
    name: Joi.string().min(2).max(255).required().messages({
        'string.base': `"name" doit être une chaîne de caractères.`,
        'string.empty': `"name" ne peut pas être vide.`,
        'string.min': `"name" doit avoir une longueur minimale de {#limit} caractères.`,
        'any.required': `"name" est un champ obligatoire.`
    }),
    address: Joi.string().optional().allow('').messages({
        'string.base': `"address" doit être une chaîne de caractères.`
    }),
    email: Joi.string().email().required().messages({
        'string.email': `"email" doit être une adresse email valide.`,
        'any.required': `"email" est un champ obligatoire.`
    }),
    phone_number: Joi.string().optional().allow('').messages({
        'string.base': `"phone_number" doit être une chaîne de caractères.`
    }),
});

// Schéma pour la validation de l'ID dans l'URL.
const companyIdSchema = Joi.object({
    id: Joi.string().uuid().required().messages({
        'string.guid': `"id" doit être un UUID valide.`,
        'any.required': `"id" est un paramètre obligatoire.`
    })
});

// Exportation des middlewares prêts à l'emploi.
export const validateCompanyCreation = validate(createCompanySchema);
export const validateCompanyId = validate(companyIdSchema, 'params');