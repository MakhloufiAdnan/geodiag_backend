import userRepository from '../repositories/userRepository.js';
import bcrypt from 'bcrypt';

/**
 * @file Gère la logique métier pour les utilisateurs (CRUD et autorisation).
 */
class UserService {
    #ensureIsAdmin(authenticatedUser) {
        if (!authenticatedUser || authenticatedUser.role !== 'admin') {
            const error = new Error('Accès refusé. Droits administrateur requis.');
            error.statusCode = 403;
            throw error;
        }
    }

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

    async getUserById(id, authenticatedUser) {
        if (authenticatedUser.role !== 'admin' && authenticatedUser.userId !== id) {
            const error = new Error('Accès refusé.');
            error.statusCode = 403;
            throw error;
        }
        return userRepository.findById(id);
    }

    async createUser(userData, authenticatedUser) {
        this.#ensureIsAdmin(authenticatedUser);
        const existingUser = await userRepository.findByEmail(userData.email);
        if (existingUser) {
            const error = new Error('Un utilisateur avec cet email existe déjà.');
            error.statusCode = 409;
            throw error;
        }
        const saltRounds = 10;
        const password_hash = await bcrypt.hash(userData.password, saltRounds);
        const newUser = { ...userData, password_hash };
        delete newUser.password;
        return userRepository.create(newUser);
    }

    async updateUser(id, userData, authenticatedUser) {
        if (authenticatedUser.role !== 'admin' && authenticatedUser.userId !== id) {
            const error = new Error('Accès refusé.');
            error.statusCode = 403;
            throw error;
        }
        if (userData.email) {
            const existingUser = await userRepository.findByEmail(userData.email);
            if (existingUser && existingUser.user_id !== id) {
                const error = new Error('Cet email est déjà utilisé par un autre compte.');
                error.statusCode = 409;
                throw error;
            }
        }
        return userRepository.update(id, userData);
    }

    async deleteUser(id, authenticatedUser) {
        this.#ensureIsAdmin(authenticatedUser);
        return userRepository.delete(id);
    }
}

export default new UserService();