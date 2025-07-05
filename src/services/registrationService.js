import companyRepository from '../repositories/companyRepository.js';
import userRepository from '../repositories/userRepository.js';
import bcrypt from 'bcrypt';
import { pool } from '../db/index.js'; 
import { generateToken } from '../utils/jwtUtils.js';
import { UserDto } from '../dtos/userDto.js'; 

class RegistrationService {
    async registerCompany(registrationData) {
        const { companyData, adminData } = registrationData;

        // Validation pour s'assurer que les emails n'existent pas déjà
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
            await client.query('BEGIN'); // Début de la transaction

            // Créer la compagnie
            const newCompany = await companyRepository.create(companyData, client);

            // Hacher le mot de passe de l'admin
            const saltRounds = 10;
            const password_hash = await bcrypt.hash(adminData.password, saltRounds);
            
            // Créer l'utilisateur admin associé
            const newAdmin = await userRepository.create({
                ...adminData,
                password_hash,
                company_id: newCompany.company_id,
                role: 'admin'
            }, client);

            // Générer le token JWT pour le nouvel admin
            const payload = { userId: newAdmin.user_id, companyId: newCompany.company_id, role: newAdmin.role };
            const token = generateToken(payload);

            await client.query('COMMIT'); // Valider la transaction

            // 3. Retourner le token avec les informations de l'utilisateur et de la compagnie
            // L'application frontend pourra utiliser ce token pour connecter l'utilisateur immédiatement.
            return {
                token,
                user: new UserDto(newAdmin),
                company: newCompany 
            };

        } catch (e) {
            await client.query('ROLLBACK'); // Annuler en cas d'erreur
            throw e;
        } finally {
            client.release(); // Libérer le client de base de données
        }
    }
}

export default new RegistrationService();