import { jest, describe, it, expect, beforeEach } from '@jest/globals';

/**
 * @file Tests unitaires pour RegistrationController.
 * @description Valide la logique du contrôleur pour l'inscription.
 */

jest.unstable_mockModule('../../src/services/registrationService.js', () => ({
    default: {
        registerCompany: jest.fn(),
    },
}));

const { default: registrationService } = await import('../../src/services/registrationService.js');
const { default: registrationController } = await import('../../src/controllers/registrationController.js');

describe('RegistrationController', () => {
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

    describe('registerCompany', () => {
        it('doit retourner 201 et les données d\'inscription en cas de succès', async () => {
            
        // Arrange
        const registrationData = { companyData: {}, adminData: {} };
        const result = { token: 'new-token', user: {}, company: {} };
        mockReq.body = registrationData;
        registrationService.registerCompany.mockResolvedValue(result);

        // Act
        await registrationController.registerCompany(mockReq, mockRes, mockNext);

        // Assert
        expect(registrationService.registerCompany).toHaveBeenCalledWith(registrationData);
        expect(mockRes.status).toHaveBeenCalledWith(201);
        expect(mockRes.json).toHaveBeenCalledWith(result);
        });
    });
});