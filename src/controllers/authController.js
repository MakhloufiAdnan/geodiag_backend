import authService from '../services/authService.js';

/**
 * @file Gère les requêtes HTTP pour l'authentification des utilisateurs.
 * @description Ce contrôleur orchestre le processus de connexion pour les admins
 * et les techniciens en appelant le service d'authentification dédié.
 */
class AuthController {
    /**
     * Gère la connexion d'un administrateur de compagnie.
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

export default new AuthController();
