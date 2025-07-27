import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { ForbiddenException } from '../../src/exceptions/apiException.js';

/**
 * @file Tests unitaires pour PaymentController.
 * @description Valide la logique du contrôleur pour l'initiation des paiements,
 * en couvrant les cas de succès et d'erreur.
 */

// Mock instable pour les modules ES, s'assurant que l'import dynamique récupère la version mockée.
jest.unstable_mockModule('../../src/services/paymentService.js', () => ({
  default: {
    createCheckoutSession: jest.fn(),
  },
}));

const { default: paymentService } = await import(
  '../../src/services/paymentService.js'
);
const { default: paymentController } = await import(
  '../../src/controllers/paymentController.js'
);

describe('PaymentController', () => {
  let mockReq, mockRes, mockNext;

  /**
   * @description Prépare un environnement de test propre avant chaque exécution.
   */
  beforeEach(() => {
    // Réinitialise l'état des mocks pour garantir l'isolation des tests.
    jest.clearAllMocks();

    mockReq = {
      body: {},
      user: { id: 'user-uuid-456', role: 'admin' },
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();
  });

  describe('createCheckoutSession', () => {
    /**
     * @description Teste le cas nominal où la création de la session réussit.
     */
    it('doit retourner 200 et la session de paiement en cas de succès', async () => {
      // Arrange : Préparer les données et configurer le service pour qu'il réussisse.
      const orderId = 'order-uuid-123';
      const session = {
        sessionId: 'cs_test_123',
        url: 'https://checkout.stripe.com/...',
      };
      mockReq.body.orderId = orderId;
      paymentService.createCheckoutSession.mockResolvedValue(session);

      // Act : Appeler la méthode du contrôleur.
      await paymentController.createCheckoutSession(mockReq, mockRes, mockNext);

      // Assert : Vérifier que le service a été appelé et que la réponse est correcte.
      expect(paymentService.createCheckoutSession).toHaveBeenCalledWith(
        orderId,
        mockReq.user
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(session);
      expect(mockNext).not.toHaveBeenCalled();
    });

    /**
     * @description Teste le cas où le service lève une erreur.
     */
    it("doit appeler le middleware next avec l'erreur si le service échoue", async () => {
      // Arrange : Préparer les données et configurer le service pour qu'il échoue.
      const orderId = 'order-uuid-123';
      const error = new ForbiddenException('Accès refusé à cette ressource.');
      mockReq.body.orderId = orderId;
      paymentService.createCheckoutSession.mockRejectedValue(error);

      // Act : Appeler la méthode du contrôleur.
      await paymentController.createCheckoutSession(mockReq, mockRes, mockNext);

      // Assert : Vérifier que l'erreur est correctement propagée.
      expect(paymentService.createCheckoutSession).toHaveBeenCalledWith(
        orderId,
        mockReq.user
      );
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
