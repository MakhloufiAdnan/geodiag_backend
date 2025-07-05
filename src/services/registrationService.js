import companyRepository from '../repositories/companyRepository.js';
import userRepository from '../repositories/userRepository.js';
import bcrypt from 'bcrypt';
import { pool } from '../db/index.js'; // Pour les transactions

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

            // 1. Créer la compagnie
            const newCompany = await companyRepository.create(companyData, client);

            // 2. Hacher le mot de passe de l'admin
            const saltRounds = 10;
            const password_hash = await bcrypt.hash(adminData.password, saltRounds);
            
            // 3. Créer l'utilisateur admin associé
            const newAdmin = await userRepository.create({
                ...adminData,
                password_hash,
                company_id: newCompany.company_id,
                role: 'admin'
            }, client);

            await client.query('COMMIT'); // Valider la transaction

            // Ne jamais renvoyer le hash du mot de passe
            delete newAdmin.password_hash;
            return { company: newCompany, admin: newAdmin };

        } catch (e) {
            await client.query('ROLLBACK'); // Annuler en cas d'erreur
            throw e;
        } finally {
            client.release(); // Libérer le client de base de données
        }
    }
}

export default new RegistrationService();