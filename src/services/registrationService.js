import bcrypt from 'bcrypt';
import { UserDto } from '../dtos/userDto.js';
import {
  ConflictException,
  BadRequestException,
} from '../exceptions/ApiException.js';
import companyRepository from '../repositories/companyRepository.js';
import userRepository from '../repositories/userRepository.js';
import { withTransaction } from '../utils/dbTransaction.js';
import {
  generateAccessToken,
  generateRefreshToken,
} from '../utils/jwtUtils.js';

/**
 * @file Gère le processus d'inscription d'une nouvelle compagnie.
 * @class RegistrationService
 */
class RegistrationService {
  /**
   * Inscrit une nouvelle compagnie et son premier administrateur de manière transactionnelle.
   * La méthode utilise l'utilitaire `withTransaction` pour garantir l'atomicité des opérations en base de données.
   *
   * @param {object} registrationData - Les données d'inscription contenant companyData et adminData.
   * @returns {Promise<{
   * accessToken: string,
   * refreshToken: string,
   * user: UserDto,
   * company: object
   * }>} Les jetons et les objets créés.
   * @throws {BadRequestException} Si les données d'inscription sont incomplètes.
   * @throws {ConflictException} Si l'email de la compagnie ou de l'administrateur existe déjà.
   */
  async registerCompany(registrationData) {
    const { companyData, adminData } = registrationData;

    if (!companyData || !adminData) {
      throw new BadRequestException(
        "Les données de la compagnie et de l'administrateur sont requises."
      );
    }

    // --- Vérifications pré-transactionnelles ---
    const existingCompany = await companyRepository.findByEmail(
      companyData.email
    );
    if (existingCompany) {
      throw new ConflictException('Une entreprise avec cet email existe déjà.');
    }

    const existingAdmin = await userRepository.findByEmail(adminData.email);
    if (existingAdmin) {
      throw new ConflictException('Un utilisateur avec cet email existe déjà.');
    }

    // --- Opérations transactionnelles ---
    return withTransaction(async (client) => {
      // 1. Créer la compagnie
      const newCompany = await companyRepository.create(companyData, client);

      // 2. Hacher le mot de passe de l'admin
      const saltRounds = 10;
      const password_hash = await bcrypt.hash(adminData.password, saltRounds);

      // 3. Créer l'utilisateur admin
      const newAdmin = await userRepository.create(
        {
          ...adminData,
          password_hash,
          company_id: newCompany.company_id,
          role: 'admin',
        },
        client
      );

      // 4. Générer les jetons
      const payload = {
        userId: newAdmin.user_id,
        companyId: newCompany.company_id,
        role: newAdmin.role,
      };
      const accessToken = generateAccessToken(payload);
      const refreshToken = generateRefreshToken(payload);

      // 5. Retourner le résultat complet
      return {
        accessToken,
        refreshToken,
        user: new UserDto(newAdmin),
        company: newCompany,
      };
    });
  }
}

export default new RegistrationService();
