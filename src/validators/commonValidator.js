import Joi from "joi";
import { validate } from "../middleware/validationMiddleware.js";

const uuidParamSchema = (paramName = "id") =>
  Joi.object({
    // Utilise une clé dynamique pour le nom du paramètre
    [paramName]: Joi.string()
      .uuid()
      .required()
      .messages({
        "string.guid": `Le paramètre d'URL "${paramName}" doit être un UUID valide.`,
        "any.required": `Le paramètre d'URL "${paramName}" est obligatoire.`,
      }),
  });

/**
 * Middleware pour valider un paramètre d'URL de type UUID.
 * @param {string} [paramName='id'] - Le nom du paramètre dans l'URL (ex: 'id', 'userId').
 */
export const validateUuidParam = (paramName = "id") =>
  validate(uuidParamSchema(paramName), "params");
