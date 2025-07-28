/**
 * @file Tests unitaires pour RegistrationController.
 * @description Valide que le contrôleur gère correctement le succès (création de cookie)
 * et l'échec (propagation d'erreur) du service d'inscription.
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { ConflictException } from '../../src/exceptions/ApiException.js';

// Mock du service d'inscription pour isoler le contrôleur.
jest.unstable_mockModule('../../src/services/registrationService.js', () => ({
  default: {
    registerCompany: jest.fn(),
  },
}));

const { default: registrationService } = await import(
  '../../src/services/registrationService.js'
);
const { default: registrationController } = await import(
  '../../src/controllers/registrationController.js'
);

describe('RegistrationController', () => {
  let mockReq, mockRes, mockNext;

  /**
   * @description Prépare un environnement de test propre avant chaque exécution en réinitialisant les mocks.
   */
  beforeEach(() => {
    mockReq = { body: {} };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      cookie: jest.fn(),
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('registerCompany', () => {
    /**
     * @description Teste le cas nominal où l'inscription réussit.
     * Il vérifie que le contrôleur appelle le service, crée un cookie sécurisé
     * avec le refreshToken, et renvoie l'accessToken dans la réponse JSON.
     */
    it('doit créer un cookie et retourner les données avec un statut 201 en cas de succès', async () => {
      // Arrange : Préparer les données et le mock du service.
      const registrationData = {
        companyData: { name: 'Test Co' },
        adminData: { email: 'admin@test.com' },
      };
      const serviceResult = {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        user: { id: 'user-1' },
        company: { id: 'co-1' },
      };
      mockReq.body = registrationData;
      registrationService.registerCompany.mockResolvedValue(serviceResult);

      // Act : Appeler la méthode du contrôleur.
      await registrationController.registerCompany(mockReq, mockRes, mockNext);

      // Assert : Vérifier le comportement correct du contrôleur.
      expect(registrationService.registerCompany).toHaveBeenCalledWith(
        registrationData
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.cookie).toHaveBeenCalledWith(
        'refreshToken',
        serviceResult.refreshToken,
        expect.any(Object)
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        accessToken: serviceResult.accessToken,
        user: serviceResult.user,
        company: serviceResult.company,
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    /**
     * @description Teste le cas où le service lève une erreur (ex: e-mail déjà utilisé).
     * Il vérifie que l'erreur est correctement propagée au middleware `next`.
     */
    it("doit appeler le middleware next avec l'erreur si le service échoue", async () => {
      // Arrange
      const error = new ConflictException('Cet e-mail est déjà utilisé.');
      mockReq.body = {};
      registrationService.registerCompany.mockRejectedValue(error);

      // Act
      await registrationController.registerCompany(mockReq, mockRes, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
