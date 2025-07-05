import userService from '../services/userService.js';
import { UserDto } from '../dtos/userDto.js';

/**
 * Gère les requêtes HTTP pour l'entité "User".
 * Chaque méthode délègue la logique métier au service (`userService`)
 * et utilise un bloc try...catch pour passer les erreurs au gestionnaire
 * d'erreurs centralisé (`errorHandler`) via `next(error)`.
 */
class UserController {

    /**
     * Récupère une liste paginée d'utilisateurs.
     * Les paramètres de pagination (page, limit) sont lus depuis les query params.
     * @param {object} req - L'objet de la requête Express.
     * @param {object} res - L'objet de la réponse Express.
     * @param {function} next - La fonction middleware suivante.
     */
    async getAllUsers(req, res, next) {
        try {
            
            // Définit les valeurs par défaut pour la pagination si non fournies.
            const page = parseInt(req.query.page, 10) || 1;
            const limit = parseInt(req.query.limit, 10) || 10;
            
            const paginatedResult = await userService.getAllUsers(page, limit);
            
            // Transforme chaque utilisateur en DTO avant de l'envoyer au client.
            paginatedResult.data = paginatedResult.data.map(user => new UserDto(user));
            
            res.status(200).json(paginatedResult);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Récupère un utilisateur spécifique par son ID.
     * @param {object} req - L'objet de la requête Express (req.params.id).
     * @param {object} res - L'objet de la réponse Express.
     * @param {function} next - La fonction middleware suivante.
     */
    async getUserById(req, res, next) {
        try {
            const user = await userService.getUserById(req.params.id);
            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }
            res.status(200).json(new UserDto(user));
        } catch (error) {
            next(error);
        }
    }

    /**
     * Crée un nouvel utilisateur.
     * Note : La validation des données d'entrée (req.body) est gérée
     * en amont par le middleware de validation Joi dans `userRoutes.js`.
     * @param {object} req - L'objet de la requête Express (req.body).
     * @param {object} res - L'objet de la réponse Express.
     * @param {function} next - La fonction middleware suivante.
     */
    async createUser(req, res, next) {
        try {
            const newUser = await userService.createUser(req.body);
            res.status(201).json(new UserDto(newUser));
        } catch (error) {
            next(error);
        }
    }

    /**
     * Met à jour un utilisateur existant.
     * Note : La validation des données d'entrée (req.body) devrait aussi
     * être gérée par un middleware Joi dans `userRoutes.js`.
     * @param {object} req - L'objet de la requête Express (req.params.id, req.body).
     * @param {object} res - L'objet de la réponse Express.
     * @param {function} next - La fonction middleware suivante.
     */
    async updateUser(req, res, next) {
        try {
            const updatedUser = await userService.updateUser(req.params.id, req.body);
            if (!updatedUser) {
                return res.status(404).json({ message: "User not found" });
            }
            res.status(200).json(new UserDto(updatedUser));
        } catch (error) {
            next(error);
        }
    }

    /**
     * Supprime un utilisateur.
     * @param {object} req - L'objet de la requête Express (req.params.id).
     * @param {object} res - L'objet de la réponse Express.
     * @param {function} next - La fonction middleware suivante.
     */
    async deleteUser(req, res, next) {
        try {
            const deletedUser = await userService.deleteUser(req.params.id);
            if (!deletedUser) {
                return res.status(404).json({ message: "User not found" });
            }
            // Renvoie un statut 204 (No Content), pratique standard pour un DELETE réussi.
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    }
}

// Exporte une instance unique du contrôleur.
export default new UserController();