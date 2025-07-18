import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { UnauthorizedException, ForbiddenException } from '../../src/exceptions/apiException.js';

/**
 * @file Tests unitaires pour AuthService.
 * @description Valide la logique d'authentification, y compris la vérification des rôles
 * et la validité des licences, en isolant les dépendances externes.
 */

// Mocker toutes les dépendances du service pour l'isoler
jest.unstable_mockModule('../../src/repositories/userRepository.js', () => ({ default: { findByEmail: jest.fn() } }));
jest.unstable_mockModule('../../src/repositories/licenseRepository.js', () => ({ default: { findActiveByCompanyId: jest.fn() } }));
jest.unstable_mockModule('bcrypt', () => ({ default: { compare: jest.fn() } }));
jest.unstable_mockModule('../../src/utils/jwtUtils.js', () => ({ generateToken: jest.fn(() => 'mock-jwt-token') }));

const { default: userRepository } = await import('../../src/repositories/userRepository.js');
const { default: licenseRepository } = await import('../../src/repositories/licenseRepository.js');
const { default: bcrypt } = await import('bcrypt');
const { default: authService } = await import('../../src/services/authService.js');

describe('AuthService', () => {
    beforeEach(() => { jest.clearAllMocks(); });

    /**
     * @describe Suite de tests pour la méthode loginCompanyAdmin.
     */
    describe('loginCompanyAdmin', () => {
        const adminUser = { user_id: 'admin-id', role: 'admin', password_hash: 'hashed' };

        /**
         * @it Doit retourner un token et un DTO utilisateur si les identifiants admin sont corrects.
         */
        it('doit retourner un token et un DTO utilisateur si les identifiants admin sont corrects', async () => {

        // Arrange
        userRepository.findByEmail.mockResolvedValue(adminUser);
        bcrypt.compare.mockResolvedValue(true);
        
        // Act
        const result = await authService.loginCompanyAdmin('admin@test.com', 'password');

        // Assert
        expect(result).toHaveProperty('token', 'mock-jwt-token');
        expect(result.user.role).toBe('admin');
        expect(userRepository.findByEmail).toHaveBeenCalledWith('admin@test.com');
        expect(bcrypt.compare).toHaveBeenCalledWith('password', 'hashed');
        });

        /**
         * @it Doit lever une UnauthorizedException si le mot de passe est incorrect.
         */
        it('doit lever une UnauthorizedException si le mot de passe est incorrect', async () => {

        // Arrange
        userRepository.findByEmail.mockResolvedValue(adminUser);
        bcrypt.compare.mockResolvedValue(false); // Simule un mot de passe incorrect
        const action = () => authService.loginCompanyAdmin('admin@test.com', 'wrong-password');

        // Act & Assert
        await expect(action).rejects.toThrow(UnauthorizedException);
        });

        /**
         * @it Doit lever une UnauthorizedException si l'utilisateur trouvé n'a pas le rôle 'admin'.
         */
        it('doit lever une UnauthorizedException si le rôle n\'est pas admin', async () => {

        // Arrange
        const techUser = { role: 'technician', password_hash: 'hashed' };
        userRepository.findByEmail.mockResolvedValue(techUser);
        bcrypt.compare.mockResolvedValue(true);
        const action = () => authService.loginCompanyAdmin('tech@test.com', 'password');

        // Act & Assert
        await expect(action).rejects.toThrow('Identifiants invalides ou accès non autorisé.');
        });
    });

    /**
     * @describe Suite de tests pour la méthode loginTechnician.
     */
    describe('loginTechnician', () => {
        const techUser = { user_id: 'tech-id', company_id: 'co-id', role: 'technician', password_hash: 'hashed' };

        /**
         * @it Doit retourner un token si le technicien est valide et que sa compagnie a une licence active.
         */
        it('doit retourner un token si le technicien a une licence active', async () => {

        // Arrange
        userRepository.findByEmail.mockResolvedValue(techUser);
        bcrypt.compare.mockResolvedValue(true);
        licenseRepository.findActiveByCompanyId.mockResolvedValue({ status: 'active' });
        
        // Act
        const result = await authService.loginTechnician('tech@test.com', 'password');

        // Assert
        expect(result).toHaveProperty('token');
        expect(licenseRepository.findActiveByCompanyId).toHaveBeenCalledWith('co-id');
        });

        /**
         * @it Doit lever une ForbiddenException si la compagnie du technicien n'a pas de licence active.
         */
        it('doit lever une ForbiddenException si la licence est inactive', async () => {
            
        // Arrange
        userRepository.findByEmail.mockResolvedValue(techUser);
        bcrypt.compare.mockResolvedValue(true);
        licenseRepository.findActiveByCompanyId.mockResolvedValue(null); // Simule une licence inactive
        const action = () => authService.loginTechnician('tech@test.com', 'password');

        // Act & Assert
        await expect(action).rejects.toThrow(ForbiddenException);
        await expect(action).rejects.toThrow('La licence de votre entreprise est inactive ou a expiré.');
        });
    });
});