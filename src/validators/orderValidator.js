import Joi from 'joi';
import { validate } from '../middleware/validationMiddleware.js';

const createOrderSchema = Joi.object({
    offerId: Joi.string().uuid().required().messages({
        'string.guid': "L'ID de l'offre doit être un UUID valide.",
        'any.required': "L'ID de l'offre est obligatoire."
    })
});
export const validateOrderCreation = validate(createOrderSchema);