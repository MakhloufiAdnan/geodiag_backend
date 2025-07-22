import companyRepository from '../repositories/companyRepository.js';
import userRepository from '../repositories/userRepository.js';
import bcrypt from 'bcrypt';
import { pool } from '../db/index.js'; 
import { generateAccessToken, generateRefreshToken } from '../utils/jwtUtils.js';
import { UserDto } from '../dtos/userDto.js'; 
import { ConflictException, BadRequestException } from '../exceptions/apiException.js';

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

        // Valider que les données nécessaires sont présentes
        if (!companyData || !adminData) {

            // Utilise BadRequestException pour les données manquantes ou mal formées
            throw new BadRequestException("Les données de la compagnie et de l'administrateur sont requises.");
        }

        const existingCompany = await companyRepository.findByEmail(companyData.email);
        if (existingCompany) {

            // Utilise ConflictException pour un email déjà existant.
            throw new ConflictException('Une entreprise avec cet email existe déjà.');
        }

        const existingAdmin = await userRepository.findByEmail(adminData.email);
        if (existingAdmin) {
            throw new ConflictException('Un utilisateur avec cet email existe déjà.');
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
            const accessToken = generateAccessToken(payload);
            const refreshToken = generateRefreshToken(payload);
            
            await client.query('COMMIT');

            return { accessToken, refreshToken, user: new UserDto(newAdmin), company: newCompany };
        } catch (e) {
            await client.query('ROLLBACK');
            
            // Relance l'erreur pour qu'elle soit gérée par le errorHandler central.
            // Si c'est une exceptions, elle sera préservée.
            throw e;
        } finally {
            client.release();
        }
    }
}

export default new RegistrationService();
