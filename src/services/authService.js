import userRepository from '../repositories/userRepository.js';
import licenseRepository from '../repositories/licenseRepository.js';
import bcrypt from 'bcrypt';
import { generateToken } from '../utils/jwtUtils.js';
import { UserDto } from '../dtos/userDto.js';
import { UnauthorizedException, ForbiddenException } from '../exceptions/apiException.js';

/**
 * @file Gère la logique d'authentification pour les différents types d'utilisateurs.
 * @class AuthService
 */
class AuthService {
    /**
     * Valide les identifiants d'un utilisateur contre la base de données.
     * @private
     * @param {string} email - L'email de l'utilisateur.
     * @param {string} password - Le mot de passe en clair à comparer.
     * @returns {Promise<object|null>} L'objet utilisateur complet ou null si l'authentification échoue.
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
     * @throws {UnauthorizedException} Si les identifiants sont invalides ou si l'utilisateur n'est pas un admin.
     */
    async loginCompanyAdmin(email, password) {
        const user = await this.#authenticateUser(email, password);

        if (!user || user.role !== 'admin') {
            throw new UnauthorizedException('Identifiants invalides ou accès non autorisé.');
        }

        const payload = { userId: user.user_id, companyId: user.company_id, role: user.role };
        const token = generateToken(payload);
        return { token, user: new UserDto(user) };
    }

    /**
     * Gère la connexion d'un technicien, en vérifiant la validité de la licence de sa compagnie.
     * @param {string} email - L'email du technicien.
     * @param {string} password - Le mot de passe du technicien.
     * @returns {Promise<{token: string, user: UserDto}>} Le token JWT et les données de l'utilisateur.
     * @throws {UnauthorizedException} Si les identifiants sont invalides ou si l'utilisateur n'est pas un technicien.
     * @throws {ForbiddenException} Si la licence de la compagnie est inactive ou a expiré.
     */
    async loginTechnician(email, password) {
        const user = await this.#authenticateUser(email, password);

        if (!user || user.role !== 'technician') {
            throw new UnauthorizedException('Identifiants invalides ou accès non autorisé.');
        }

        const license = await licenseRepository.findActiveByCompanyId(user.company_id);
        if (!license) {
            throw new ForbiddenException('La licence de votre entreprise est inactive ou a expiré.');
        }
        
        const payload = { userId: user.user_id, companyId: user.company_id, role: user.role };
        const token = generateToken(payload);
        return { token, user: new UserDto(user) };
    }
}

export default new AuthService();