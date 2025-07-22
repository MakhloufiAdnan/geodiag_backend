/**
 * @file Tests unitaires complets pour AuthService.
 * @description Cette suite de tests valide tous les chemins logiques du service d'authentification,
 * y compris les succès, les échecs et la logique de sécurité de rotation des jetons.
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { UnauthorizedException, ForbiddenException } from '../../src/exceptions/apiException.js';

// Mocker toutes les dépendances pour isoler le service
jest.unstable_mockModule('../../src/repositories/userRepository.js', () => ({ default: { findByEmail: jest.fn(), findById: jest.fn() } }));
jest.unstable_mockModule('../../src/repositories/licenseRepository.js', () => ({ default: { findActiveByCompanyId: jest.fn() } }));
jest.unstable_mockModule('../../src/repositories/refreshTokenRepository.js', () => ({
    default: {
        create: jest.fn(),
        findByToken: jest.fn(),
        revokeFamily: jest.fn(),
        revokeTokenById: jest.fn(),
    },
}));
jest.unstable_mockModule('bcrypt', () => ({ default: { compare: jest.fn() } }));
jest.unstable_mockModule('../../src/utils/jwtUtils.js', () => ({
    generateAccessToken: jest.fn(() => 'mock-access-token'),
    generateRefreshToken: jest.fn(() => 'mock-refresh-token'),
}));
jest.unstable_mockModule('jsonwebtoken', () => ({
    default: {
        decode: jest.fn(() => ({ exp: Date.now() / 1000 + 3600 })),
        verify: jest.fn(),
    },
}));


const { default: userRepository } = await import('../../src/repositories/userRepository.js');
const { default: licenseRepository } = await import('../../src/repositories/licenseRepository.js');
const { default: refreshTokenRepository } = await import('../../src/repositories/refreshTokenRepository.js');
const { default: bcrypt } = await import('bcrypt');
const { default: jwt } = await import('jsonwebtoken');
const { default: authService } = await import('../../src/services/authService.js');

describe('AuthService', () => {
    beforeEach(() => jest.clearAllMocks());

    const adminUser = { user_id: 'admin-1', company_id: 'co-1', role: 'admin', password_hash: 'hashed' };
    const techUser = { user_id: 'tech-1', company_id: 'co-1', role: 'technician', password_hash: 'hashed' };

    // --- Tests pour loginCompanyAdmin ---
    describe('loginCompanyAdmin', () => {

        /**
         * @description Teste le cas nominal d'une connexion réussie pour un administrateur.
         */
        it('doit retourner les jetons et les données utilisateur pour une connexion admin réussie', async () => {

            // Arrange
            userRepository.findByEmail.mockResolvedValue(adminUser);
            bcrypt.compare.mockResolvedValue(true);

            // Act
            const result = await authService.loginCompanyAdmin('admin@test.com', 'password');

            // Assert
            expect(result).toHaveProperty('accessToken', 'mock-access-token');
            expect(result).toHaveProperty('refreshToken', 'mock-refresh-token');
            expect(result.user.userId).toBe(adminUser.user_id);
            expect(refreshTokenRepository.create).toHaveBeenCalled();
        });

        /**
         * @description Teste le cas où un utilisateur avec un rôle incorrect (technicien) tente d'utiliser le point d'accès admin.
         */
        it('doit lever une ForbiddenException si un technicien tente de se connecter en tant qu\'admin', async () => {
            userRepository.findByEmail.mockResolvedValue(techUser);
            bcrypt.compare.mockResolvedValue(true);

            await expect(authService.loginCompanyAdmin('tech@test.com', 'password')).rejects.toThrow(ForbiddenException);
        });

        /**
         * @description Teste le cas où l'email fourni ne correspond à aucun utilisateur.
         */
        it('doit lever une UnauthorizedException si l\'utilisateur n\'est pas trouvé', async () => {
            userRepository.findByEmail.mockResolvedValue(undefined);
            await expect(authService.loginCompanyAdmin('test@test.com', 'pass')).rejects.toThrow(UnauthorizedException);
        });

        /**
         * @description Teste le cas où le mot de passe est incorrect.
         */
        it('doit lever une UnauthorizedException si le mot de passe est incorrect', async () => {
            userRepository.findByEmail.mockResolvedValue(adminUser);
            bcrypt.compare.mockResolvedValue(false);
            await expect(authService.loginCompanyAdmin('test@test.com', 'wrong-pass')).rejects.toThrow(UnauthorizedException);
        });
    });

    // --- Tests pour loginTechnician ---
    describe('loginTechnician', () => {

        /**
         * @description Teste le cas nominal d'une connexion réussie pour un technicien avec une licence valide.
         */
        it('doit retourner les jetons pour une connexion technicien réussie avec une licence active', async () => {
            
            // Arrange
            userRepository.findByEmail.mockResolvedValue(techUser);
            bcrypt.compare.mockResolvedValue(true);
            licenseRepository.findActiveByCompanyId.mockResolvedValue({ status: 'active' });

            // Act
            const result = await authService.loginTechnician('tech@test.com', 'password');

            // Assert
            expect(result).toHaveProperty('accessToken', 'mock-access-token');
            expect(result).toHaveProperty('refreshToken', 'mock-refresh-token');
            expect(refreshTokenRepository.create).toHaveBeenCalled();
        });

        /**
         * @description Teste le cas où un utilisateur avec un rôle incorrect (admin) tente d'utiliser le point d'accès technicien.
         */
        it('doit lever une ForbiddenException si un admin tente de se connecter en tant que technicien', async () => {
            userRepository.findByEmail.mockResolvedValue(adminUser);
            bcrypt.compare.mockResolvedValue(true);

            await expect(authService.loginTechnician('admin@test.com', 'password')).rejects.toThrow(ForbiddenException);
        });

        /**
         * @description Teste le cas où la licence de la compagnie du technicien n'est pas active.
         */
        it('doit lever une ForbiddenException si la licence de la compagnie est inactive', async () => {
            userRepository.findByEmail.mockResolvedValue(techUser);
            bcrypt.compare.mockResolvedValue(true);
            licenseRepository.findActiveByCompanyId.mockResolvedValue(null); // Licence inactive

            await expect(authService.loginTechnician('tech@test.com', 'password')).rejects.toThrow(ForbiddenException);
        });
    });

    // --- Tests pour refreshTokens ---
    describe('refreshTokens', () => {
        const oldRefreshToken = 'old-refresh-token';
        const storedToken = { token_id: 'rt-1', user_id: 'user-1', family_id: 'family-1', is_revoked: false };

        it('doit retourner une nouvelle paire de jetons si le refreshToken est valide', async () => {
            refreshTokenRepository.findByToken.mockResolvedValue(storedToken);
            userRepository.findById.mockResolvedValue(adminUser);

            const result = await authService.refreshTokens(oldRefreshToken);

            expect(refreshTokenRepository.revokeTokenById).toHaveBeenCalledWith(storedToken.token_id);
            expect(refreshTokenRepository.create).toHaveBeenCalled();
            expect(result).toHaveProperty('accessToken', 'mock-access-token');
            expect(result).toHaveProperty('refreshToken', 'mock-refresh-token');
        });

        it('doit lever une UnauthorizedException si aucun refreshToken n\'est fourni', async () => {
            await expect(authService.refreshTokens(null)).rejects.toThrow(UnauthorizedException);
        });

        it('doit détecter la réutilisation si le token n\'est pas trouvé mais est un JWT valide', async () => {
            refreshTokenRepository.findByToken.mockResolvedValue(undefined);
            jwt.verify.mockReturnValue({ familyId: 'family-1' });

            await expect(authService.refreshTokens(oldRefreshToken)).rejects.toThrow('Tentative de réutilisation de jeton détectée. Session révoquée.');
            expect(refreshTokenRepository.revokeFamily).toHaveBeenCalledWith('family-1');
        });

        it('doit lever une ForbiddenException si le token est simplement invalide (signature)', async () => {
            refreshTokenRepository.findByToken.mockResolvedValue(undefined);
            jwt.verify.mockImplementation(() => { throw new Error('Invalid signature'); });

            await expect(authService.refreshTokens('invalid-token')).rejects.toThrow('Jeton de rafraîchissement invalide.');
        });
        
        it('doit détecter la réutilisation si le token est trouvé mais déjà révoqué', async () => {
            const revokedToken = {...storedToken, is_revoked: true };
            refreshTokenRepository.findByToken.mockResolvedValue(revokedToken);

            await expect(authService.refreshTokens(oldRefreshToken)).rejects.toThrow('Tentative de réutilisation de jeton détectée. Session révoquée.');
            expect(refreshTokenRepository.revokeFamily).toHaveBeenCalledWith(revokedToken.family_id);
        });

        /**
         * @description Teste le cas d'erreur où le jeton est valide mais l'utilisateur associé n'existe plus.
         */
        it('doit lever une ForbiddenException si l\'utilisateur associé au jeton n\'est plus trouvé', async () => {
            refreshTokenRepository.findByToken.mockResolvedValue(storedToken);
            userRepository.findById.mockResolvedValue(null); // Utilisateur non trouvé

            await expect(authService.refreshTokens(oldRefreshToken)).rejects.toThrow('Utilisateur associé au jeton non trouvé.');
        });
    });

    // --- Tests pour logout ---
    describe('logout', () => {
        it('doit révoquer la famille de jetons si un token valide est fourni', async () => {
            const storedToken = { family_id: 'family-1' };
            refreshTokenRepository.findByToken.mockResolvedValue(storedToken);

            await authService.logout('valid-refresh-token');

            expect(refreshTokenRepository.revokeFamily).toHaveBeenCalledWith('family-1');
        });

        it('ne doit rien faire si aucun token n\'est fourni', async () => {
            await authService.logout(null);
            expect(refreshTokenRepository.revokeFamily).not.toHaveBeenCalled();
        });

        it('ne doit rien faire si le token fourni n\'est pas trouvé en BDD', async () => {
            refreshTokenRepository.findByToken.mockResolvedValue(undefined);
            await authService.logout('unknown-token');
            expect(refreshTokenRepository.revokeFamily).not.toHaveBeenCalled();
        });
    });
});