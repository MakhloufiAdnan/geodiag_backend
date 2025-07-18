import { jest, describe, it, expect, beforeEach } from '@jest/globals';

/**
 * @file Tests unitaires pour AuthController.
 * @description Valide que le contrôleur d'authentification appelle le service
 * avec les bons identifiants et gère les succès et les erreurs.
 */

// 1. Mocker le service d'authentification
jest.unstable_mockModule('../../src/services/authService.js', () => ({
    default: {
        loginCompanyAdmin: jest.fn(),
        loginTechnician: jest.fn(),
    },
}));

// 2. Importer les modules après le mock
const { default: authService } = await import('../../src/services/authService.js');
const { default: authController } = await import('../../src/controllers/authController.js');

describe('AuthController', () => {
    let mockReq, mockRes, mockNext;

    beforeEach(() => {
        mockReq = { body: {} };
        mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        };
        mockNext = jest.fn();
        jest.clearAllMocks();
    });

    describe('loginCompany', () => {
        it('doit retourner un token et un statut 200 en cas de succès', async () => {

        // Arrange
        const credentials = { email: 'admin@test.com', password: 'password' };
        const authResult = { token: 'fake-jwt-token', user: { email: credentials.email } };
        mockReq.body = credentials;
        authService.loginCompanyAdmin.mockResolvedValue(authResult);

        // Act
        await authController.loginCompany(mockReq, mockRes, mockNext);

        // Assert
        expect(authService.loginCompanyAdmin).toHaveBeenCalledWith(credentials.email, credentials.password);
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith(authResult);
        expect(mockNext).not.toHaveBeenCalled();
        });

        it('doit appeler next(error) si le service lève une erreur', async () => {

        // Arrange
        const credentials = { email: 'admin@test.com', password: 'password' };
        const fakeError = new Error('Identifiants invalides');
        mockReq.body = credentials;
        authService.loginCompanyAdmin.mockRejectedValue(fakeError);

        // Act
        await authController.loginCompany(mockReq, mockRes, mockNext);

        // Assert
        expect(mockNext).toHaveBeenCalledWith(fakeError);
        });
    });

    describe('loginTechnician', () => {
        it('doit retourner un token et un statut 200 en cas de succès', async () => {
            
        // Arrange
        const credentials = { email: 'tech@test.com', password: 'password' };
        const authResult = { token: 'fake-jwt-token', user: { email: credentials.email } };
        mockReq.body = credentials;
        authService.loginTechnician.mockResolvedValue(authResult);

        // Act
        await authController.loginTechnician(mockReq, mockRes, mockNext);

        // Assert
        expect(authService.loginTechnician).toHaveBeenCalledWith(credentials.email, credentials.password);
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith(authResult);
        });
    });
});