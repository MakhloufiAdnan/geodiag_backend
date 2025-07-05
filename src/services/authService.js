import userRepository from '../repositories/userRepository.js';
import licenseRepository from '../repositories/licenseRepository.js';
import bcrypt from 'bcrypt';
import { generateToken } from '../utils/jwtUtils.js';
import { UserDto } from '../dtos/userDto.js';

class AuthService {
    /**
     * Méthode privée pour la logique d'authentification commune.
     */
    async #authenticateUser(email, password) {
        const user = await userRepository.findByEmail(email);
        if (!user) return null;

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) return null;

        return user;
    }

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

    async loginTechnician(email, password) {
        const user = await this.#authenticateUser(email, password);

        if (!user || user.role !== 'technician') {
            const error = new Error('Identifiants invalides ou accès non autorisé.');
            error.statusCode = 401;
            throw error;
        }

        const license = await licenseRepository.findActiveByCompanyId(user.company_id);
        if (!license) {
            const error = new Error('La licence de votre entreprise est inactive ou a expiré.');
            error.statusCode = 403;
            throw error;
        }
        
        const payload = { userId: user.user_id, companyId: user.company_id, role: user.role };
        const token = generateToken(payload);
        return { token, user: new UserDto(user) };
    }
}

export default new AuthService();