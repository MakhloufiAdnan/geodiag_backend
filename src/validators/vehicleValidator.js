import Joi from 'joi';
import { validate } from '../middleware/validationMiddleware.js';

/**
 * @file Définit les schémas de validation pour les routes des véhicules.
 */

const createVehicleSchema = Joi.object({
  model_id: Joi.string().uuid().required().messages({
    'string.guid': "L'ID du modèle doit être un UUID valide.",
    'any.required': "L'ID du modèle est obligatoire.",
  }),
  registration: Joi.string().required().messages({
    'any.required': "Le numéro d'immatriculation est obligatoire.",
  }),
  vin: Joi.string().length(17).required().messages({
    'string.length': 'Le VIN doit contenir exactement 17 caractères.',
    'any.required': 'Le VIN est obligatoire.',
  }),
  first_registration_date: Joi.date().iso().required().messages({
    'date.format':
      "La date d'immatriculation doit être au format ISO (AAAA-MM-JJ).",
    'any.required': 'La date de première immatriculation est obligatoire.',
  }),
  energy: Joi.string()
    .valid('diesel', 'gasoline', 'electric', 'hybrid', 'other')
    .required()
    .messages({
      'any.only': "Le type d'énergie n'est pas valide.",
      'any.required': "Le type d'énergie est obligatoire.",
    }),
  mileage: Joi.number().integer().positive().required().messages({
    'number.base': 'Le kilométrage doit être un nombre.',
    'number.integer': 'Le kilométrage doit être un nombre entier.',
    'number.positive': 'Le kilométrage doit être un nombre positif.',
    'any.required': 'Le kilométrage est obligatoire.',
  }),
  current_wheel_size: Joi.string().optional().allow(''),
  options: Joi.object().optional(),
});

const registrationParamSchema = Joi.object({
  registration: Joi.string().required().messages({
    'any.required': "Le paramètre d'immatriculation est manquant dans l'URL.",
  }),
});

export const validateVehicleCreation = validate(createVehicleSchema);
export const validateVehicleRegistration = validate(
  registrationParamSchema,
  'params'
);
