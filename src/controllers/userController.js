import userService from '../services/userService.js';
import { UserDto } from '../dtos/userDto.js';

/**
 * @file Gère les requêtes HTTP pour l'entité "User".
 */
class UserController {
    /**
     * Récupère une liste paginée d'utilisateurs.
     */
    async getAllUsers(req, res, next) {
        try {
            const { page, limit } = req.pagination;
            const paginatedResult = await userService.getAllUsers(page, limit);
            paginatedResult.data = paginatedResult.data.map(user => new UserDto(user));
            res.status(200).json(paginatedResult);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Récupère un utilisateur par son ID.
     */
    async getUserById(req, res, next) {
        try {
            const user = await userService.getUserById(req.params.id, req.user);
            res.status(200).json(new UserDto(user));
        } catch (error) {
            next(error);
        }
    }

    /**
     * Crée un nouvel utilisateur (généralement un technicien par un admin).
     */
    async createUser(req, res, next) {
        try {
            const newUser = await userService.createUser(req.body, req.user);
            res.status(201).json(new UserDto(newUser));
        } catch (error) {
            next(error);
        }
    }

    /**
     * Met à jour un utilisateur.
     */
    async updateUser(req, res, next) {
        try {
            const updatedUser = await userService.updateUser(req.params.id, req.body, req.user);
            res.status(200).json(new UserDto(updatedUser));
        } catch (error) {
            next(error);
        }
    }

    /**
     * Supprime un utilisateur.
     */
    async deleteUser(req, res, next) {
    try {
        // Le service lèvera une exception si l'utilisateur n'est pas trouvé.
        await userService.deleteUser(req.params.id, req.user);
        res.status(204).send();
    } catch (error) {
        next(error);
    }
}
}

export default new UserController();