import Joi from "joi";
import { validate } from "../middleware/validationMiddleware.js";

/**
 * @file Définit le schéma de validation pour la création de commandes.
 */
const createOrderSchema = Joi.object({
  offerId: Joi.string().uuid().required().messages({
    "string.guid": "L'ID de l'offre doit être un UUID valide.",
    "any.required": "L'ID de l'offre est obligatoire.",
  }),
});

export const validateOrderCreation = validate(createOrderSchema);
