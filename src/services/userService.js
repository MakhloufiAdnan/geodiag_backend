import userRepository from '../repositories/userRepository.js';
import bcrypt from 'bcrypt';

class UserService {
    async getAllUsers(page, limit) {
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

    async getUserById(id) {
        return userRepository.findById(id);
    }

    async createUser(userData) {
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

    async updateUser(id, userData) {
        // Validation : si l'email est changé, il doit rester unique.
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

    async deleteUser(id) {
        return userRepository.delete(id);
    }
}

export default new UserService();