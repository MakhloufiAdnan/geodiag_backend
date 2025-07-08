import Joi from 'joi';
import { validate } from '../middleware/validationMiddleware.js';

/**
 * @file Définit les schémas de validation pour l'inscription d'une compagnie.
 */

// Schéma pour les données de la compagnie
const companyRegistrationSchema = Joi.object({
    name: Joi.string().min(2).max(255).required().messages({
        'string.min': 'Le nom de la compagnie doit contenir au moins 2 caractères.',
        'any.required': 'Le nom de la compagnie est obligatoire.'
    }),
    address: Joi.string().optional().allow(''),
    email: Joi.string().email().required().messages({
        'string.email': 'L\'email de la compagnie doit être une adresse valide.',
        'any.required': 'L\'email de la compagnie est obligatoire.'
    }),
    phone_number: Joi.string().optional().allow('')
});

// Schéma pour les données de l'administrateur
const adminRegistrationSchema = Joi.object({
    email: Joi.string().email().required().messages({
        'string.email': 'L\'email de l\'administrateur doit être une adresse valide.',
        'any.required': 'L\'email de l\'administrateur est obligatoire.'
    }),
    password: Joi.string().min(8).required().messages({
        'string.min': 'Le mot de passe doit contenir au moins 8 caractères.',
        'any.required': 'Le mot de passe est obligatoire.'
    }),
    first_name: Joi.string().required().messages({ 'any.required': 'Le prénom est obligatoire.' }),
    last_name: Joi.string().required().messages({ 'any.required': 'Le nom de famille est obligatoire.' })
});

// Schéma principal qui imbrique les deux autres.
const registerCompanySchema = Joi.object({
    companyData: companyRegistrationSchema.required(),
    adminData: adminRegistrationSchema.required()
});

export const validateRegister = validate(registerCompanySchema);