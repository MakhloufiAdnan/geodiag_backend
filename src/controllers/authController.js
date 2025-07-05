import authService from '../services/authService.js';

/**
 * Gère les requêtes HTTP pour l'authentification des utilisateurs.
 */
class AuthController {
    
    /**
     * Gère la connexion d'un administrateur de compagnie.
     * Note : La validation des données (email, password) est gérée en amont
     * par le middleware Joi dans le fichier `authRoutes.js`.
     * @param {object} req - L'objet de la requête Express.
     * @param {object} res - L'objet de la réponse Express.
     * @param {function} next - La fonction middleware suivante.
     */
    async loginCompany(req, res, next) {
        try {
            const { email, password } = req.body;
            const result = await authService.loginCompanyAdmin(email, password);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Gère la connexion d'un technicien.
     * Note : La validation des données (email, password) est gérée en amont
     * par le middleware Joi dans le fichier `authRoutes.js`.
     * @param {object} req - L'objet de la requête Express.
     * @param {object} res - L'objet de la réponse Express.
     * @param {function} next - La fonction middleware suivante.
     */
    async loginTechnician(req, res, next) {
        try {
            const { email, password } = req.body;
            const result = await authService.loginTechnician(email, password);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }
}

// Exporte une instance unique du contrôleur.
export default new AuthController();