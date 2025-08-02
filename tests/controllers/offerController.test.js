/**
 * @file Tests unitaires pour OfferController.
 * @description Valide que le contrôleur public des offres appelle le service approprié
 * et formate correctement la réponse HTTP.
 */
import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// --- MOCKING DES DÉPENDANCES ---
jest.unstable_mockModule('../../src/services/offerService.js', () => ({
  default: {
    // Simule la méthode spécifique aux offres publiques
    getAllPublicOffers: jest.fn(),
  },
}));

// --- IMPORTS APRÈS LES MOCKS ---
const { default: offerService } = await import(
  '../../src/services/offerService.js'
);
const { default: offerController } = await import(
  '../../src/controllers/offerController.js'
);

describe('OfferController', () => {
  let mockReq, mockRes, mockNext;

  /**
   * Prépare un environnement de test propre avant chaque exécution.
   */
  beforeEach(() => {
    // La requête est vide car la route est publique et ne nécessite pas de corps ou de paramètres.
    mockReq = {};
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('getAllOffers (route publique)', () => {
    /**
     * @description Teste le cas nominal où le service retourne une liste d'offres.
     */
    it('doit retourner 200 et la liste des offres publiques', async () => {
      // Arrange
      const fakeOffers = [{ id: 'offer-1', name: 'Basic Plan' }];
      offerService.getAllPublicOffers.mockResolvedValue(fakeOffers);

      // Act
      await offerController.getAllOffers(mockReq, mockRes, mockNext);

      // Assert
      // Vérifie que la méthode pour les offres PUBLIQUES a été appelée, sans argument.
      expect(offerService.getAllPublicOffers).toHaveBeenCalledWith();
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(fakeOffers);
      expect(mockNext).not.toHaveBeenCalled();
    });

    /**
     * @description Teste le cas où le service lève une erreur.
     */
    it('doit appeler next(error) si le service lève une erreur', async () => {
      // Arrange
      const fakeError = new Error('Erreur de base de données');
      offerService.getAllPublicOffers.mockRejectedValue(fakeError);

      // Act
      await offerController.getAllOffers(mockReq, mockRes, mockNext);

      // Assert
      // Vérifie que l'erreur est bien propagée au gestionnaire d'erreurs d'Express.
      expect(mockNext).toHaveBeenCalledWith(fakeError);
    });
  });
});
