import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { ConflictException } from '../../src/exceptions/apiException.js';

/**
 * @file Tests unitaires pour RegistrationService.
 * @description Cette suite teste le processus d'inscription, y compris la création
 * transactionnelle, la gestion des conflits d'emails et le hachage de mot de passe.
 */

// 1. Mocker les dépendances pour isoler le service
process.env.JWT_SECRET = 'test-secret';

jest.unstable_mockModule('../../src/repositories/companyRepository.js', () => ({ default: { findByEmail: jest.fn(), create: jest.fn() } }));
jest.unstable_mockModule('../../src/repositories/userRepository.js', () => ({ default: { findByEmail: jest.fn(), create: jest.fn() } }));
jest.unstable_mockModule('bcrypt', () => ({ default: { hash: jest.fn() } }));
jest.unstable_mockModule('../../src/db/index.js', () => ({
    pool: {
        connect: jest.fn(),
    }
}));

// Le mock de jwtUtils est nécessaire car le service l'appelle
jest.unstable_mockModule('../../src/utils/jwtUtils.js', () => ({
    generateToken: jest.fn(() => 'mock-jwt-token'),
}));


// 2. Imports après les mocks
const { default: companyRepository } = await import('../../src/repositories/companyRepository.js');
const { default: userRepository } = await import('../../src/repositories/userRepository.js');
const { default: bcrypt } = await import('bcrypt');
const { pool } = await import('../../src/db/index.js');
const { default: registrationService } = await import('../../src/services/registrationService.js');


describe('RegistrationService', () => {

    // Simuler un client de base de données pour les transactions
    const mockDbClient = {
        query: jest.fn(),
        release: jest.fn()
    };

    // Réinitialiser les mocks avant chaque test
    beforeEach(() => {
        jest.clearAllMocks();

        // S'assurer que pool.connect retourne toujours notre client mocké
        pool.connect.mockResolvedValue(mockDbClient);
    });

    /**
     * @describe Tests pour la méthode registerCompany.
     */
    describe('registerCompany', () => {
        const registrationData = {
            companyData: { name: 'New Co', email: 'co@new.com' },
            adminData: { email: 'admin@new.com', password: 'password123', first_name: 'Admin', last_name: 'User' }
        };

        it('doit créer une compagnie et un admin, hacher le mot de passe, et renvoyer un token', async () => {

            // Arrange
            companyRepository.findByEmail.mockResolvedValue(null);
            userRepository.findByEmail.mockResolvedValue(null);
            bcrypt.hash.mockResolvedValue('hashed_password');
            companyRepository.create.mockResolvedValue({ company_id: 'co-uuid', ...registrationData.companyData });
            userRepository.create.mockResolvedValue({ user_id: 'user-uuid', role: 'admin', ...registrationData.adminData });

            // Act
            const result = await registrationService.registerCompany(registrationData);

            // Assert
            expect(mockDbClient.query).toHaveBeenCalledWith('BEGIN');
            expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
            expect(companyRepository.create).toHaveBeenCalledWith(registrationData.companyData, mockDbClient);
            expect(userRepository.create).toHaveBeenCalledWith(expect.objectContaining({ password_hash: 'hashed_password' }), mockDbClient);
            expect(mockDbClient.query).toHaveBeenCalledWith('COMMIT');
            expect(result).toHaveProperty('token', 'mock-jwt-token');
            expect(result.user.email).toBe('admin@new.com');
            expect(mockDbClient.release).toHaveBeenCalled();
        });

        it("doit lever une ConflictException si l'email de la compagnie existe déjà", async () => {

            // Arrange
            companyRepository.findByEmail.mockResolvedValue({ email: 'co@new.com' }); // La compagnie existe
            userRepository.findByEmail.mockResolvedValue(null);
            const action = () => registrationService.registerCompany(registrationData);

            // Act & Assert
            await expect(action).rejects.toThrow(ConflictException);
            await expect(action).rejects.toThrow('Une entreprise avec cet email existe déjà.');
            expect(mockDbClient.query).not.toHaveBeenCalled(); // La transaction ne doit même pas commencer
        });

        it("doit lever une ConflictException si l'email de l'admin existe déjà", async () => {

            // Arrange
            companyRepository.findByEmail.mockResolvedValue(null);
            userRepository.findByEmail.mockResolvedValue({ email: 'admin@new.com' }); // L'admin existe
            const action = () => registrationService.registerCompany(registrationData);

            // Act & Assert
            await expect(action).rejects.toThrow(ConflictException);
            await expect(action).rejects.toThrow('Un utilisateur avec cet email existe déjà.');
            expect(mockDbClient.query).not.toHaveBeenCalled();
        });

        it("doit exécuter un ROLLBACK si la création de l'utilisateur échoue après celle de la compagnie", async () => {
            
            // Arrange
            companyRepository.findByEmail.mockResolvedValue(null);
            userRepository.findByEmail.mockResolvedValue(null);
            bcrypt.hash.mockResolvedValue('hashed_password');
            companyRepository.create.mockResolvedValue({ company_id: 'co-uuid' });
            userRepository.create.mockRejectedValue(new Error('DB error on user creation')); 

            // Act & Assert
            await expect(registrationService.registerCompany(registrationData)).rejects.toThrow('DB error on user creation');
            expect(mockDbClient.query).toHaveBeenCalledWith('BEGIN');
            expect(mockDbClient.query).toHaveBeenCalledWith('ROLLBACK');
            expect(mockDbClient.query).not.toHaveBeenCalledWith('COMMIT');
            expect(mockDbClient.release).toHaveBeenCalled();
        });
    });
});
