import registrationService from '../services/registrationService.js';

/**
 * Gère la requête HTTP pour l'inscription d'une nouvelle compagnie.
 */
class RegistrationController {
    
    /**
     * Gère la création d'une nouvelle compagnie et de son utilisateur admin.
     * Note : La validation des données d'entrée (req.body) est gérée
     * en amont par le middleware de validation Joi dans le fichier de routes
     * (`registrationRoutes.js`).
     * @param {object} req - L'objet de la requête Express.
     * @param {object} res - L'objet de la réponse Express.
     * @param {function} next - La fonction middleware suivante.
     */
    async registerCompany(req, res, next) {
        try {
            const result = await registrationService.registerCompany(req.body);

            // Renvoie les données de la compagnie et de l'admin créés avec un statut 201.
            res.status(201).json(result);
        } catch (error) {

            // Passe toute erreur au gestionnaire d'erreurs centralisé.
            next(error);
        }
    }
}

// Exporte une instance unique du contrôleur.
export default new RegistrationController();