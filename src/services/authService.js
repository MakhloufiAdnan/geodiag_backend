import userRepository from '../repositories/userRepository.js';
import licenseRepository from '../repositories/licenseRepository.js';
import bcrypt from 'bcrypt';
import { generateToken } from '../utils/jwtUtils.js';
import { UserDto } from '../dtos/userDto.js';

/**
 * @file Gère la logique d'authentification pour les différents types d'utilisateurs.
 */
class AuthService {
    /**
     * Méthode privée pour la logique d'authentification commune.
     * @param {string} email - L'email de l'utilisateur.
     * @param {string} password - Le mot de passe en clair.
     * @returns {Promise<object|null>} L'objet utilisateur complet ou null si l'authentification échoue.
     * @private
     */
    async #authenticateUser(email, password) {
        const user = await userRepository.findByEmail(email);
        if (!user) return null;

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) return null;

        return user;
    }

    /**
     * Gère la connexion d'un administrateur de compagnie.
     * @param {string} email - L'email de l'admin.
     * @param {string} password - Le mot de passe de l'admin.
     * @returns {Promise<{token: string, user: UserDto}>} Le token JWT et les données de l'utilisateur.
     */
    async loginCompanyAdmin(email, password) {
        const user = await this.#authenticateUser(email, password);

        if (!user || user.role !== 'admin') {
            const error = new Error('Identifiants invalides ou accès non autorisé.');
            error.statusCode = 401;
            throw error;
        }

        const payload = { userId: user.user_id, companyId: user.company_id, role: user.role };
        const token = generateToken(payload);
        return { token, user: new UserDto(user) };
    }

    /**
     * Gère la connexion d'un technicien.
     * @param {string} email - L'email du technicien.
     * @param {string} password - Le mot de passe du technicien.
     * @returns {Promise<{token: string, user: UserDto}>} Le token JWT et les données de l'utilisateur.
     */
    async loginTechnician(email, password) {
        const user = await this.#authenticateUser(email, password);

        if (!user || user.role !== 'technician') {
            const error = new Error('Identifiants invalides ou accès non autorisé.');
            error.statusCode = 401;
            throw error;
        }

        // Vérification critique : la compagnie du technicien doit avoir une licence active.
        const license = await licenseRepository.findActiveByCompanyId(user.company_id);
        if (!license) {
            const error = new Error('La licence de votre entreprise est inactive ou a expiré.');
            error.statusCode = 403; // Forbidden
            throw error;
        }
        
        const payload = { userId: user.user_id, companyId: user.company_id, role: user.role };
        const token = generateToken(payload);
        return { token, user: new UserDto(user) };
    }
}

export default new AuthService();