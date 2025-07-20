import Joi from 'joi';
import { validate } from '../middleware/validationMiddleware.js';

/**
 * @file Définit les schémas de validation pour les routes des utilisateurs.
 */
const createUserSchema = Joi.object({
    email: Joi.string().email().required().messages({
        'string.email': 'L\'email doit être une adresse valide.',
        'any.required': 'L\'email est obligatoire.'
    }),
    password: Joi.string().min(8).required().messages({
        'string.min': 'Le mot de passe doit contenir au moins 8 caractères.',
        'any.required': 'Le mot de passe est obligatoire.'
    }),
    first_name: Joi.string().required().messages({ 'any.required': 'Le prénom est obligatoire.' }),
    last_name: Joi.string().required().messages({ 'any.required': 'Le nom de famille est obligatoire.' }),
    role: Joi.string().valid('admin', 'technician').required().messages({
        'any.only': 'Le rôle doit être "admin" ou "technician".',
        'any.required': 'Le rôle est obligatoire.'
    }),
    company_id: Joi.string().uuid().required().messages({
        'string.guid': 'L\'ID de la compagnie doit être un UUID valide.',
        'any.required': 'L\'ID de la compagnie est obligatoire.'
    }),
});

export const validateUserCreation = validate(createUserSchema);