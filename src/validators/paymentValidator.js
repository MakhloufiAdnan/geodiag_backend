import Joi from 'joi';

export const createCheckoutSchema = Joi.object({
    orderId: Joi.string().uuid().required().messages({
        'string.guid': "L'ID de la commande doit être un UUID valide.",
        'any.required': "L'ID de la commande est obligatoire."
    })
});