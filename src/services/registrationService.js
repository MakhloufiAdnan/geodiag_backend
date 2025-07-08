import companyRepository from '../repositories/companyRepository.js';
import userRepository from '../repositories/userRepository.js';
import bcrypt from 'bcrypt';
import { pool } from '../db/index.js'; 
import { generateToken } from '../utils/jwtUtils.js';
import { UserDto } from '../dtos/userDto.js'; 

/**
 * @file Gère le processus d'inscription d'une nouvelle compagnie.
 */
class RegistrationService {
    /**
     * Inscrit une nouvelle compagnie et son premier administrateur.
     * @param {object} registrationData - Les données d'inscription.
     * @returns {Promise<{token: string, user: UserDto, company: object}>} Le token et les objets créés.
     */
    async registerCompany(registrationData) {
        const { companyData, adminData } = registrationData;

        const existingCompany = await companyRepository.findByEmail(companyData.email);
        if (existingCompany) {
            const error = new Error('Une entreprise avec cet email existe déjà.');
            error.statusCode = 409;
            throw error;
        }
        const existingAdmin = await userRepository.findByEmail(adminData.email);
        if (existingAdmin) {
            const error = new Error('Un utilisateur avec cet email existe déjà.');
            error.statusCode = 409;
            throw error;
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const newCompany = await companyRepository.create(companyData, client);
            const saltRounds = 10;
            const password_hash = await bcrypt.hash(adminData.password, saltRounds);
            const newAdmin = await userRepository.create({
                ...adminData,
                password_hash,
                company_id: newCompany.company_id,
                role: 'admin'
            }, client);

            const payload = { userId: newAdmin.user_id, companyId: newCompany.company_id, role: newAdmin.role };
            const token = generateToken(payload);
            await client.query('COMMIT');

            return { token, user: new UserDto(newAdmin), company: newCompany };
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    }
}

export default new RegistrationService();
