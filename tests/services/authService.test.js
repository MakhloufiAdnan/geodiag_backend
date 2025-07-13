import { jest, describe, it, expect, beforeEach } from '@jest/globals';

jest.unstable_mockModule('../../src/repositories/userRepository.js', () => ({ default: { findByEmail: jest.fn() } }));
jest.unstable_mockModule('../../src/repositories/licenseRepository.js', () => ({ default: { findActiveByCompanyId: jest.fn() } }));
jest.unstable_mockModule('bcrypt', () => ({ default: { compare: jest.fn() } }));
jest.unstable_mockModule('../../src/utils/jwtUtils.js', () => ({ generateToken: jest.fn() }));

const { default: userRepository } = await import('../../src/repositories/userRepository.js');
const { default: licenseRepository } = await import('../../src/repositories/licenseRepository.js');
const { default: bcrypt } = await import('bcrypt');
const { default: authService } = await import('../../src/services/authService.js');

describe('AuthService', () => {
    beforeEach(() => { jest.clearAllMocks(); });

    describe('loginCompanyAdmin', () => {
        it('doit retourner un token si les identifiants admin sont corrects', async () => {
            // Arrange
            const adminUser = { user_id: 'admin-id', role: 'admin', password_hash: 'hashed' };
            userRepository.findByEmail.mockResolvedValue(adminUser);
            bcrypt.compare.mockResolvedValue(true);

            // Act
            const result = await authService.loginCompanyAdmin('admin@test.com', 'password');

            // Assert
            expect(result).toHaveProperty('token');
            expect(result.user.role).toBe('admin');
        });

        it('doit lever une erreur si le rôle n\'est pas admin', async () => {
            // Arrange
            const techUser = { role: 'technician', password_hash: 'hashed' };
            userRepository.findByEmail.mockResolvedValue(techUser);
            bcrypt.compare.mockResolvedValue(true);
            const action = () => authService.loginCompanyAdmin('tech@test.com', 'password');

            // Act & Assert
            await expect(action).rejects.toThrow('Identifiants invalides ou accès non autorisé.');
        });
    });

    describe('loginTechnician', () => {
        it('doit retourner un token si le technicien a une licence active', async () => {
            // Arrange
            const techUser = { user_id: 'tech-id', company_id: 'co-id', role: 'technician', password_hash: 'hashed' };
            userRepository.findByEmail.mockResolvedValue(techUser);
            bcrypt.compare.mockResolvedValue(true);
            licenseRepository.findActiveByCompanyId.mockResolvedValue({ status: 'active' });

            // Act
            const result = await authService.loginTechnician('tech@test.com', 'password');

            // Assert
            expect(result).toHaveProperty('token');
            expect(licenseRepository.findActiveByCompanyId).toHaveBeenCalledWith('co-id');
        });

        it('doit lever une erreur si la licence est inactive', async () => {
            // Arrange
            const techUser = { role: 'technician', password_hash: 'hashed' };
            userRepository.findByEmail.mockResolvedValue(techUser);
            bcrypt.compare.mockResolvedValue(true);
            licenseRepository.findActiveByCompanyId.mockResolvedValue(null); // Pas de licence active
            const action = () => authService.loginTechnician('tech@test.com', 'password');

            // Act & Assert
            await expect(action).rejects.toThrow('La licence de votre entreprise est inactive ou a expiré.');
        });
    });
});