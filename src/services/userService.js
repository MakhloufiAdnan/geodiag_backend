import userRepository from '../repositories/userRepository.js';
import bcrypt from 'bcrypt';
import { ForbiddenException, NotFoundException, ConflictException } from '../exceptions/apiException.js';

/**
 * @file Gère la logique métier pour les utilisateurs (CRUD et autorisation).
 * @class UserService
 */
class UserService {
    /**
     * Vérifie si l'utilisateur authentifié a le rôle d'administrateur.
     * @private
     * @param {object} authenticatedUser - L'objet utilisateur issu du token.
     * @throws {ForbiddenException} Si l'utilisateur n'est pas un administrateur.
     */
    #ensureIsAdmin(authenticatedUser) {
        if (!authenticatedUser || authenticatedUser.role !== 'admin') {
            throw new ForbiddenException('Accès refusé. Droits administrateur requis.');
        }
    }

    /**
     * Récupère une liste paginée d'utilisateurs. Accessible uniquement aux administrateurs.
     * @param {number} page - Le numéro de la page.
     * @param {number} limit - Le nombre d'éléments par page.
     * @param {object} authenticatedUser - L'utilisateur effectuant la requête.
     * @returns {Promise<{data: Array<object>, meta: object}>} Un objet contenant les utilisateurs et les métadonnées de pagination.
     */
    async getAllUsers(page, limit, authenticatedUser) {
        this.#ensureIsAdmin(authenticatedUser);
        const offset = (page - 1) * limit;
        const [users, totalItems] = await Promise.all([
            userRepository.findAll(limit, offset),
            userRepository.countAll()
        ]);
        return {
            data: users,
            meta: {
                totalItems,
                totalPages: Math.ceil(totalItems / limit),
                currentPage: page,
                pageSize: limit,
            },
        };
    }

    /**
     * Récupère un utilisateur par son ID.
     * Un admin peut voir n'importe quel utilisateur, un utilisateur standard ne peut voir que son propre profil.
     * @param {string} id - L'ID de l'utilisateur à récupérer.
     * @param {object} authenticatedUser - L'utilisateur effectuant la requête.
     * @returns {Promise<object>} L'objet utilisateur trouvé.
     * @throws {ForbiddenException} Si l'utilisateur n'a pas les droits pour voir le profil demandé.
     * @throws {NotFoundException} Si aucun utilisateur n'est trouvé pour cet ID.
     */
    async getUserById(id, authenticatedUser) {
        if (authenticatedUser.role !== 'admin' && authenticatedUser.userId !== id) {
            throw new ForbiddenException('Accès refusé.');
        }
        const user = await userRepository.findById(id);
        if (!user) {
            throw new NotFoundException('Utilisateur non trouvé.');
        }
        return user;
    }

    /**
     * Crée un nouvel utilisateur. Accessible uniquement aux administrateurs.
     * @param {object} userData - Les données du nouvel utilisateur.
     * @param {object} authenticatedUser - L'administrateur effectuant la création.
     * @returns {Promise<object>} Le nouvel utilisateur créé.
     * @throws {ConflictException} Si l'email est déjà utilisé.
     */
    async createUser(userData, authenticatedUser) {
        this.#ensureIsAdmin(authenticatedUser);
        const existingUser = await userRepository.findByEmail(userData.email);
        if (existingUser) {
            throw new ConflictException('Un utilisateur avec cet email existe déjà.');
        }
        const saltRounds = 10;
        const password_hash = await bcrypt.hash(userData.password, saltRounds);
        const newUser = { ...userData, password_hash };
        delete newUser.password;
        return userRepository.create(newUser);
    }

    /**
     * Met à jour un utilisateur existant.
     * @param {string} id - L'ID de l'utilisateur à mettre à jour.
     * @param {object} userData - Les données à mettre à jour.
     * @param {object} authenticatedUser - L'utilisateur effectuant la mise à jour.
     * @returns {Promise<object>} L'utilisateur mis à jour.
     * @throws {NotFoundException} Si l'utilisateur à mettre à jour n'est pas trouvé.
     */
    async updateUser(id, userData, authenticatedUser) {
        if (authenticatedUser.role !== 'admin' && authenticatedUser.userId !== id) {
            throw new ForbiddenException('Accès refusé.');
        }
        if (userData.email) {
            const existingUser = await userRepository.findByEmail(userData.email);
            if (existingUser && existingUser.user_id !== id) {
                throw new ConflictException('Cet email est déjà utilisé par un autre compte.');
            }
        }
        const updatedUser = await userRepository.update(id, userData);
        if (!updatedUser) {
            throw new NotFoundException('Utilisateur non trouvé pour la mise à jour.');
        }
        return updatedUser;
    }

    /**
     * Supprime un utilisateur. Accessible uniquement aux administrateurs.
     * @param {string} id - L'ID de l'utilisateur à supprimer.
     * @param {object} authenticatedUser - L'administrateur effectuant la suppression.
     * @returns {Promise<object>} L'utilisateur qui a été supprimé.
     * @throws {NotFoundException} Si l'utilisateur à supprimer n'est pas trouvé.
     */
    async deleteUser(id, authenticatedUser) {
        this.#ensureIsAdmin(authenticatedUser);
        const deletedUser = await userRepository.delete(id);
        if (!deletedUser) {
            throw new NotFoundException('Utilisateur non trouvé pour la suppression.');
        }
        return deletedUser;
    }
}

export default new UserService();