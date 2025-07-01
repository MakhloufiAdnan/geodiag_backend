import userService from '../services/userService.js';
import { UserDto } from '../dtos/userDto.js';

class UserController {
    
    /**
     * @swagger
     * /users:
     * get:
     * summary: Récupère une liste paginée d'utilisateurs
     * tags: [Users]
     * parameters:
     * - in: query
     * name: page
     * schema:
     * type: integer
     * default: 1
     * description: Le numéro de la page à retourner.
     * - in: query
     * name: limit
     * schema:
     * type: integer
     * default: 10
     * description: Le nombre d'utilisateurs par page.
     * responses:
     * 200:
     * description: Une liste paginée d'utilisateurs.
     * content:
     * application/json:
     * schema:
     * type: object
     * properties:
     * data:
     * type: array
     * items:
     * $ref: '#/components/schemas/UserDto'
     * meta:
     * $ref: '#/components/schemas/PaginationMeta'
     * 500:
     * description: Erreur serveur.
     */
    async getAllUsers(req, res) {
        try {
            // Récupère les paramètres de l'URL, avec des valeurs par défaut
            const page = parseInt(req.query.page, 10) || 1;
            const limit = parseInt(req.query.limit, 10) || 10;

            const paginatedResult = await userService.getAllUsers(page, limit);

            // On transforme les données de la page actuelle en DTO
            paginatedResult.data = paginatedResult.data.map(user => new UserDto(user));
            res.status(200).json(paginatedResult);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Error fetching users" });
        }
    }

    /**
     * @swagger
     * /users/{id}:
     * get:
     * summary: Récupère un utilisateur par son ID
     * tags: [Users]
     * parameters:
     * - in: path
     * name: id
     * required: true
     * schema:
     * type: string
     * format: uuid
     * description: L'ID de l'utilisateur.
     * responses:
     * 200:
     * description: Les détails de l'utilisateur.
     * content:
     * application/json:
     * schema:
     * $ref: '#/components/schemas/UserDto'
     * 404:
     * description: Utilisateur non trouvé.
     * 500:
     * description: Erreur serveur.
     */
    async getUserById(req, res) {
        try {
            const user = await userService.getUserById(req.params.id);
            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }
            res.status(200).json(new UserDto(user));
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Error fetching user" });
        }
    }

    /**
     * @swagger
     * /users:
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
     * 201:
     * description: Utilisateur créé avec succès.
     * content:
     * application/json:
     * schema:
     * $ref: '#/components/schemas/UserDto'
     * 409:
     * description: Conflit, l'email existe déjà.
     * 500:
     * description: Erreur serveur.
     */
    async createUser(req, res) {
        try {
            const dataToCreate = req.body;
            const newUser = await userService.createUser(dataToCreate);
            res.status(201).json(new UserDto(newUser)); 
        } catch (error) {
            const statusCode = error.statusCode || 500; 
            res.status(statusCode).json({ message: error.message });
        }
    }

    /**
     * @swagger
     * /users/{id}:
     * put:
     * summary: Met à jour un utilisateur existant
     * tags: [Users]
     * parameters:
     * - in: path
     * name: id
     * required: true
     * schema:
     * type: string
     * format: uuid
     * description: L'ID de l'utilisateur à mettre à jour.
     * requestBody:
     * required: true
     * content:
     * application/json:
     * schema:
     * $ref: '#/components/schemas/UpdateUserInput'
     * responses:
     * 200:
     * description: Utilisateur mis à jour avec succès.
     * content:
     * application/json:
     * schema:
     * $ref: '#/components/schemas/UserDto'
     * 404:
     * description: Utilisateur non trouvé.
     * 409:
     * description: Conflit, l'email est déjà utilisé par un autre compte.
     * 500:
     * description: Erreur serveur.
     */
    async updateUser(req, res) {
        try {
            const updatedUser = await userService.updateUser(req.params.id, req.body);
            if (!updatedUser) {
                return res.status(404).json({ message: "User not found" });
            }

            res.status(200).json(new UserDto(updatedUser)); 
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Error updating user" });
        }
    }

    /**
     * @swagger
     * /users/{id}:
     * delete:
     * summary: Supprime un utilisateur
     * tags: [Users]
     * parameters:
     * - in: path
     * name: id
     * required: true
     * schema:
     * type: string
     * format: uuid
     * description: L'ID de l'utilisateur à supprimer.
     * responses:
     * 204:
     * description: Utilisateur supprimé avec succès.
     * 404:
     * description: Utilisateur non trouvé.
     * 500:
     * description: Erreur serveur.
     */
    async deleteUser(req, res) {
        try {
            const deletedUser = await userService.deleteUser(req.params.id);
            if (!deletedUser) {
                return res.status(404).json({ message: "User not found" });
            }
            res.status(204).send();
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Error deleting user" });
        }
    }
}

export default new UserController();