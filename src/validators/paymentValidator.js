import Joi from "joi";
import { validate } from "../middleware/validationMiddleware.js";

/**
 * @file Définit les schémas de validation pour le processus de paiement.
 */

// Schéma pour la création d'une session de paiement.
const createCheckoutSchema = Joi.object({
  orderId: Joi.string().uuid().required().messages({
    "string.guid": "L'ID de la commande doit être un UUID valide.",
    "any.required": "L'ID de la commande est obligatoire.",
  }),
});

// Exporte le middleware prêt à l'emploi.
export const validateCheckoutCreation = validate(createCheckoutSchema);
