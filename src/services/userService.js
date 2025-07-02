import userRepository from '../repositories/userRepository.js';
import bcrypt from 'bcrypt';
import { generateToken } from '../utils/jwtUtils.js';

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
        // 1. Validation : l'email doit être unique.
        const existingUser = await userRepository.findByEmail(userData.email);
        if (existingUser) {
            const error = new Error('Un utilisateur avec cet email existe déjà.');
            error.statusCode = 409; // HTTP 409 Conflict
            throw error;
        }

        // 2. Hachage du mot de passe avant sauvegarde.
        const saltRounds = 10;
        const password_hash = await bcrypt.hash(userData.password, saltRounds);

        // 3. Préparation des données pour la création.
        // Le company_id doit être fourni par le contrôleur (depuis le token de l'admin).
        const newUser = {
            ...userData,
            password_hash,
        };
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

    async loginUser(email, password) {
        // 1. Trouver l'utilisateur par email
        const user = await userRepository.findByEmail(email);
        if (!user) {
            throw new Error('Identifiants invalides');
        }

        // 2. Vérifier le mot de passe
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            throw new Error('Identifiants invalides');
        }

        // 3. Si tout est bon, générer et retourner le token
        const token = generateToken(user.user_id);
        return { token, user: new UserDto(user) }; // Retourne le token et les infos utilisateur
    }
}

export default new UserService();