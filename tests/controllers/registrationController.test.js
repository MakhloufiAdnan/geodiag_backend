import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { ConflictException } from '../../src/exceptions/apiException.js';

/**
 * @file Tests unitaires pour RegistrationController.
 * @description Valide la logique du contrôleur pour l'inscription,
 * en couvrant les cas de succès et d'erreur.
 */

// Mock du service d'inscription pour isoler le contrôleur.
jest.unstable_mockModule('../../src/services/registrationService.js', () => ({
    default: {
        registerCompany: jest.fn(),
    },
}));

const { default: registrationService } = await import('../../src/services/registrationService.js');
const { default: registrationController } = await import('../../src/controllers/registrationController.js');

describe('RegistrationController', () => {
    let mockReq, mockRes, mockNext;

    /**
     * @description Prépare un environnement de test propre avant chaque exécution.
     */
    beforeEach(() => {
        jest.clearAllMocks();
        mockReq = { body: {} };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        mockNext = jest.fn();
    });

    describe('registerCompany', () => {
        /**
         * @description Teste le cas nominal où l'inscription réussit.
         */
        it('doit retourner 201 et les données d\'inscription en cas de succès', async () => {
            // Arrange : Préparer les données et configurer le service pour qu'il réussisse.
            const registrationData = { companyData: { name: 'Test Co' }, adminData: { email: 'admin@test.com' } };
            const result = { token: 'new-jwt-token', user: {}, company: {} };
            mockReq.body = registrationData;
            registrationService.registerCompany.mockResolvedValue(result);

            // Act : Appeler la méthode du contrôleur.
            await registrationController.registerCompany(mockReq, mockRes, mockNext);

            // Assert : Vérifier que le service a été appelé et que la réponse est correcte.
            expect(registrationService.registerCompany).toHaveBeenCalledWith(registrationData);
            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith(result);
            expect(mockNext).not.toHaveBeenCalled();
        });

        /**
         * @description Teste le cas où le service lève une erreur (ex: e-mail déjà utilisé).
         */
        it('doit appeler le middleware next avec l\'erreur si le service échoue', async () => {
            // Arrange : Préparer les données et configurer le service pour qu'il échoue.
            const registrationData = { companyData: {}, adminData: {} };
            const error = new ConflictException('Cet e-mail est déjà utilisé.');
            mockReq.body = registrationData;
            registrationService.registerCompany.mockRejectedValue(error);

            // Act : Appeler la méthode du contrôleur.
            await registrationController.registerCompany(mockReq, mockRes, mockNext);

            // Assert : Vérifier que l'erreur est correctement propagée au middleware suivant.
            expect(registrationService.registerCompany).toHaveBeenCalledWith(registrationData);
            expect(mockRes.status).not.toHaveBeenCalled();
            expect(mockRes.json).not.toHaveBeenCalled();
            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });
});
