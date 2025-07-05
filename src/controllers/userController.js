import userService from '../services/userService.js';
import { UserDto } from '../dtos/userDto.js';

class UserController {

    /**
     * Récupère une liste paginée d'utilisateurs.
     * Seul un admin devrait pouvoir le faire.
     */
    async getAllUsers(req, res, next) {
        try {
            const page = parseInt(req.query.page, 10) || 1;
            const limit = parseInt(req.query.limit, 10) || 10;
            
            // On passe l'utilisateur authentifié pour la vérification des droits
            const paginatedResult = await userService.getAllUsers(page, limit, req.user);
            
            paginatedResult.data = paginatedResult.data.map(user => new UserDto(user));
            res.status(200).json(paginatedResult);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Récupère un utilisateur. Un admin peut voir tout le monde,
     * un utilisateur ne peut voir que son propre profil.
     */
    async getUserById(req, res, next) {
        try {

            // Passe l'utilisateur authentifié pour la vérification des droits
            const user = await userService.getUserById(req.params.id, req.user);
            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }
            res.status(200).json(new UserDto(user));
        } catch (error) {
            next(error);
        }
    }

    /**
     * Crée un nouvel utilisateur. Seul un admin peut le faire.
     */
    async createUser(req, res, next) {
        try {
            // Passe l'utilisateur authentifié pour que le service puisse vérifier son rôle.
            const newUser = await userService.createUser(req.body, req.user);
            res.status(201).json(new UserDto(newUser));
        } catch (error) {
            next(error);
        }
    }

    /**
     * Met à jour un utilisateur. Un admin peut mettre à jour tout le monde,
     * un utilisateur ne peut mettre à jour que son propre profil.
     */
    async updateUser(req, res, next) {
        try {
            // Passe l'utilisateur authentifié pour la vérification des droits
            const updatedUser = await userService.updateUser(req.params.id, req.body, req.user);
            if (!updatedUser) {
                return res.status(404).json({ message: "User not found" });
            }
            res.status(200).json(new UserDto(updatedUser));
        } catch (error) {
            next(error);
        }
    }

    /**
     * Supprime un utilisateur. Seul un admin peut le faire.
     */
    async deleteUser(req, res, next) {
        try {
            // Passe l'utilisateur authentifié pour la vérification des droits
            const deletedUser = await userService.deleteUser(req.params.id, req.user);
            if (!deletedUser) {
                return res.status(404).json({ message: "User not found" });
            }
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    }
}

export default new UserController();