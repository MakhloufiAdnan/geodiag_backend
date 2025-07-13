import { jest, describe, it, expect, beforeEach } from '@jest/globals';

process.env.JWT_SECRET = 'test-secret';

jest.unstable_mockModule('../../src/repositories/companyRepository.js', () => ({ default: { findByEmail: jest.fn(), create: jest.fn() } }));
jest.unstable_mockModule('../../src/repositories/userRepository.js', () => ({ default: { findByEmail: jest.fn(), create: jest.fn() } }));
jest.unstable_mockModule('bcrypt', () => ({ default: { hash: jest.fn() } }));
jest.unstable_mockModule('../../src/db/index.js', () => ({ pool: { connect: jest.fn() } }));

const { default: companyRepository } = await import('../../src/repositories/companyRepository.js');
const { default: userRepository } = await import('../../src/repositories/userRepository.js');
const { default: bcrypt } = await import('bcrypt');
const { pool } = await import('../../src/db/index.js');
const { default: registrationService } = await import('../../src/services/registrationService.js');

describe('RegistrationService', () => {
    const mockDbClient = { query: jest.fn(), release: jest.fn() };

    beforeEach(() => {
        jest.clearAllMocks();
        pool.connect.mockResolvedValue(mockDbClient);
    });

    it('registerCompany doit créer une compagnie et un admin, et renvoyer un token', async () => {
        // Arrange
        const registrationData = {
            companyData: { name: 'New Co', email: 'co@new.com' },
            adminData: { email: 'admin@new.com', password: 'password123', first_name: 'Admin' }
        };
        companyRepository.findByEmail.mockResolvedValue(null);
        userRepository.findByEmail.mockResolvedValue(null);
        bcrypt.hash.mockResolvedValue('hashed_password');
        companyRepository.create.mockResolvedValue({ company_id: 'co-uuid', ...registrationData.companyData });
        userRepository.create.mockResolvedValue({ user_id: 'user-uuid', role: 'admin', ...registrationData.adminData });

        // Act
        const result = await registrationService.registerCompany(registrationData);

        // Assert
        expect(mockDbClient.query).toHaveBeenCalledWith('BEGIN');
        expect(companyRepository.create).toHaveBeenCalled();
        expect(userRepository.create).toHaveBeenCalled();
        expect(mockDbClient.query).toHaveBeenCalledWith('COMMIT');
        expect(result).toHaveProperty('token');
        expect(result.user.email).toBe('admin@new.com');
    });

    it('doit faire un ROLLBACK si la création de l\'utilisateur échoue', async () => {
        // Arrange
        const registrationData = { companyData: {}, adminData: {} };
        companyRepository.findByEmail.mockResolvedValue(null);
        userRepository.findByEmail.mockResolvedValue(null);
        companyRepository.create.mockResolvedValue({ company_id: 'co-uuid' });
        userRepository.create.mockRejectedValue(new Error('DB error'));

        // Act & Assert
        await expect(registrationService.registerCompany(registrationData)).rejects.toThrow('DB error');
        expect(mockDbClient.query).toHaveBeenCalledWith('BEGIN');
        expect(mockDbClient.query).toHaveBeenCalledWith('ROLLBACK');
        expect(mockDbClient.query).not.toHaveBeenCalledWith('COMMIT');
    });
});