import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { ConflictException } from '../../src/exceptions/ApiException.js';
import { mockRegistrationData } from '../../mocks/mockData.js'; // Importation des données centralisées

/**
 * @file Tests unitaires pour RegistrationService.
 * @description Cette suite teste le processus d'inscription, y compris la création
 * transactionnelle, la gestion des conflits d'emails et le hachage de mot de passe.
 */

// 1. Mocker les dépendances pour isoler le service
process.env.JWT_SECRET = 'test-secret';

jest.unstable_mockModule('../../src/repositories/companyRepository.js', () => ({
  default: { findByEmail: jest.fn(), create: jest.fn() },
}));
jest.unstable_mockModule('../../src/repositories/userRepository.js', () => ({
  default: { findByEmail: jest.fn(), create: jest.fn() },
}));
jest.unstable_mockModule('bcrypt', () => ({ default: { hash: jest.fn() } }));
jest.unstable_mockModule('../../src/db/index.js', () => ({
  pool: {
    connect: jest.fn(),
  },
}));
jest.unstable_mockModule('../../src/utils/jwtUtils.js', () => ({
  generateAccessToken: jest.fn(() => 'mock-access-token'),
  generateRefreshToken: jest.fn(() => 'mock-refresh-token'),
}));

// 2. Imports après les mocks
const { default: companyRepository } = await import(
  '../../src/repositories/companyRepository.js'
);
const { default: userRepository } = await import(
  '../../src/repositories/userRepository.js'
);
const { default: bcrypt } = await import('bcrypt');
const { pool } = await import('../../src/db/index.js');
const { default: registrationService } = await import(
  '../../src/services/registrationService.js'
);

describe('RegistrationService', () => {
  // Simuler un client de base de données pour les transactions
  const mockDbClient = {
    query: jest.fn(),
    release: jest.fn(),
  };

  // Réinitialiser les mocks avant chaque test
  beforeEach(() => {
    jest.clearAllMocks();
    pool.connect.mockResolvedValue(mockDbClient);
  });

  describe('registerCompany', () => {
    it('doit créer une compagnie et un admin, hacher le mot de passe, et renvoyer les tokens', async () => {
      // Arrange
      companyRepository.findByEmail.mockResolvedValue(null);
      userRepository.findByEmail.mockResolvedValue(null);
      bcrypt.hash.mockResolvedValue('hashed_password');
      companyRepository.create.mockResolvedValue({
        company_id: 'co-uuid',
        ...mockRegistrationData.companyData,
      });
      userRepository.create.mockResolvedValue({
        user_id: 'user-uuid',
        role: 'admin',
        ...mockRegistrationData.adminData,
      });

      // Act
      const result =
        await registrationService.registerCompany(mockRegistrationData);

      // Assert
      expect(mockDbClient.query).toHaveBeenCalledWith('BEGIN');
      expect(bcrypt.hash).toHaveBeenCalledWith(
        mockRegistrationData.adminData.password,
        10
      );
      expect(companyRepository.create).toHaveBeenCalledWith(
        mockRegistrationData.companyData,
        mockDbClient
      );
      expect(userRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ password_hash: 'hashed_password' }),
        mockDbClient
      );
      expect(mockDbClient.query).toHaveBeenCalledWith('COMMIT');
      expect(result).toHaveProperty('accessToken', 'mock-access-token');
      expect(result.user.email).toBe(mockRegistrationData.adminData.email);
      expect(mockDbClient.release).toHaveBeenCalled();
    });

    it("doit lever une ConflictException si l'email de la compagnie existe déjà", async () => {
      // Arrange
      companyRepository.findByEmail.mockResolvedValue({
        email: mockRegistrationData.companyData.email,
      });
      userRepository.findByEmail.mockResolvedValue(null);

      // Act & Assert
      await expect(
        registrationService.registerCompany(mockRegistrationData)
      ).rejects.toThrow(
        new ConflictException('Une entreprise avec cet email existe déjà.')
      );

      // La transaction ne doit même pas commencer
      expect(mockDbClient.query).not.toHaveBeenCalled();
    });

    it("doit lever une ConflictException si l'email de l'admin existe déjà", async () => {
      // Arrange
      companyRepository.findByEmail.mockResolvedValue(null);
      userRepository.findByEmail.mockResolvedValue({
        email: mockRegistrationData.adminData.email,
      });

      // Act & Assert
      await expect(
        registrationService.registerCompany(mockRegistrationData)
      ).rejects.toThrow(
        new ConflictException('Un utilisateur avec cet email existe déjà.')
      );

      // La transaction ne doit même pas commencer
      expect(mockDbClient.query).not.toHaveBeenCalled();
    });

    it("doit exécuter un ROLLBACK si la création de l'utilisateur échoue", async () => {
      // Arrange
      companyRepository.findByEmail.mockResolvedValue(null);
      userRepository.findByEmail.mockResolvedValue(null);
      bcrypt.hash.mockResolvedValue('hashed_password');
      companyRepository.create.mockResolvedValue({ company_id: 'co-uuid' });
      userRepository.create.mockRejectedValue(
        new Error('DB error on user creation')
      );

      // Act & Assert
      await expect(
        registrationService.registerCompany(mockRegistrationData)
      ).rejects.toThrow('DB error on user creation');

      expect(mockDbClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockDbClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockDbClient.query).not.toHaveBeenCalledWith('COMMIT');
      expect(mockDbClient.release).toHaveBeenCalled();
    });
  });
});
