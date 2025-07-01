import userService from '../services/userService.js';
import { UserDto } from '../dtos/userDto.js';

/**
 * Gère la logique des requêtes HTTP pour les utilisateurs.
 * Chaque méthode attrape les erreurs et les passe au gestionnaire
 * d'erreurs centralisé via `next(error)`.
 */
class UserController {

    /**
     * @swagger
     * /api/users:
     * get:
     * summary: Récupère une liste paginée d'utilisateurs
     * tags: [Users]
     * parameters:
     * - in: query
     * name: page
     * schema: { type: integer, default: 1 }
     * description: Le numéro de la page à retourner.
     * - in: query
     * name: limit
     * schema: { type: integer, default: 10 }
     * description: Le nombre d'utilisateurs par page.
     * responses:
     * "200":
     * description: Une liste paginée d'utilisateurs.
     * content:
     * application/json:
     * schema:
     * $ref: '#/components/schemas/PaginatedUsers'
     * "500":
     * description: Erreur serveur.
     */
    async getAllUsers(req, res, next) {
        try {
            const page = parseInt(req.query.page, 10) || 1;
            const limit = parseInt(req.query.limit, 10) || 10;
            const paginatedResult = await userService.getAllUsers(page, limit);
            paginatedResult.data = paginatedResult.data.map(user => new UserDto(user));
            res.status(200).json(paginatedResult);
        } catch (error) {
            next(error);
        }
    }

    /**
     * @swagger
     * /api/users/{id}:
     * get:
     * summary: Récupère un utilisateur par son ID
     * tags: [Users]
     * parameters:
     * - in: path
     * name: id
     * required: true
     * schema: { type: string, format: uuid }
     * description: L'ID de l'utilisateur.
     * responses:
     * "200":
     * description: Les détails de l'utilisateur.
     * content:
     * application/json:
     * schema:
     * $ref: '#/components/schemas/UserDto'
     * "404":
     * description: Utilisateur non trouvé.
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
     * @swagger
     * /api/users:
     * post:
     * summary: Crée un nouvel utilisateur
     * tags: [Users]
     * requestBody:
     * required: true
     * content:
     * application/json:
     * schema:
     * $ref: '#/components/schemas/CreateUserInput'
     * responses:
     * "201":
     * description: Utilisateur créé avec succès.
     * content:
     * application/json:
     * schema:
     * $ref: '#/components/schemas/UserDto'
     * "400":
     * description: Données d'entrée invalides.
     * "409":
     * description: Conflit, l'email existe déjà.
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
     * @swagger
     * /api/users/{id}:
     * put:
     * summary: Met à jour un utilisateur existant
     * tags: [Users]
     * parameters:
     * - in: path
     * name: id
     * required: true
     * schema: { type: string, format: uuid }
     * description: L'ID de l'utilisateur à mettre à jour.
     * requestBody:
     * required: true
     * content:
     * application/json:
     * schema:
     * $ref: '#/components/schemas/UpdateUserInput'
     * responses:
     * "200":
     * description: Utilisateur mis à jour avec succès.
     * content:
     * application/json:
     * schema:
     * $ref: '#/components/schemas/UserDto'
     * "404":
     * description: Utilisateur non trouvé.
     * "409":
     * description: Conflit, l'email est déjà utilisé.
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
     * @swagger
     * /api/users/{id}:
     * delete:
     * summary: Supprime un utilisateur
     * tags: [Users]
     * security:
     * - bearerAuth: []
     * parameters:
     * - in: path
     * name: id
     * required: true
     * schema: { type: string, format: uuid }
     * description: L'ID de l'utilisateur à supprimer.
     * responses:
     * "204":
     * description: Utilisateur supprimé avec succès (pas de contenu).
     * "401":
     * description: Non autorisé.
     * "404":
     * description: Utilisateur non trouvé.
     */
    async deleteUser(req, res, next) {
        try {
            const deletedUser = await userService.deleteUser(req.params.id);
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