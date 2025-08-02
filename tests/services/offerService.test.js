/**
 * @file Tests unitaires pour OfferService.
 * @description Valide la logique métier du service, y compris la gestion du cache
 * pour les offres publiques et les opérations CRUD, en isolant les dépendances.
 */
import { jest, describe, it, expect, beforeEach } from '@jest/globals';

import { mockOffer } from '../../mocks/mockData.js';

// --- MOCKING DES DÉPENDANCES ---
// Le service est entièrement isolé de la base de données et de Redis.

jest.unstable_mockModule('../../src/repositories/offerRepository.js', () => ({
  default: {
    findAll: jest.fn(), // Ajout du mock pour la méthode admin
    findAllPublic: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));
jest.unstable_mockModule('../../src/config/redisClient.js', () => ({
  default: { get: jest.fn(), set: jest.fn(), del: jest.fn() },
}));
jest.unstable_mockModule('../../src/config/logger.js', () => ({
  default: { info: jest.fn(), error: jest.fn() },
}));

// --- IMPORTS APRÈS LES MOCKS ---
const { default: offerRepository } = await import(
  '../../src/repositories/offerRepository.js'
);
const { default: redisClient } = await import(
  '../../src/config/redisClient.js'
);
const { default: offerService } = await import(
  '../../src/services/offerService.js'
);

describe('OfferService', () => {
  /**
   * Réinitialise tous les mocks avant chaque test pour garantir l'isolation.
   */
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllPublicOffers', () => {
    /**
     * @description Valide que le service retourne les données de la base de données
     * en cas d'échec de la lecture du cache, assurant la résilience.
     */
    it('doit retourner les données de la BDD si le cache Redis échoue', async () => {
      // Arrange
      redisClient.get.mockRejectedValue(new Error('Redis connection error'));
      offerRepository.findAllPublic.mockResolvedValue([mockOffer]);

      // Act
      const result = await offerService.getAllPublicOffers();

      // Assert
      expect(offerRepository.findAllPublic).toHaveBeenCalledTimes(1);
      expect(result[0].name).toBe(mockOffer.name);
    });
  });

  describe('createOffer', () => {
    /**
     * @description Vérifie que la création d'une offre invalide correctement le cache public.
     */
    it('doit invalider le cache public après la création', async () => {
      // Arrange
      const offerData = { name: 'New Offer' };
      offerRepository.create.mockResolvedValue({ offer_id: '2', ...offerData });

      // Act
      await offerService.createOffer(offerData);

      // Assert
      expect(offerRepository.create).toHaveBeenCalledWith(offerData);
      expect(redisClient.del).toHaveBeenCalledWith('offers:public');
    });
  });

  describe('updateOffer', () => {
    /**
     * @description Vérifie que la mise à jour d'une offre invalide correctement le cache public.
     */
    it('doit invalider le cache public après la mise à jour', async () => {
      // Arrange
      const offerId = '1';
      const offerData = { name: 'Updated Offer' };
      offerRepository.update.mockResolvedValue({
        offer_id: offerId,
        ...offerData,
      });

      // Act
      await offerService.updateOffer(offerId, offerData);

      // Assert
      expect(offerRepository.update).toHaveBeenCalledWith(offerId, offerData);
      expect(redisClient.del).toHaveBeenCalledWith('offers:public');
    });
  });

  describe('deleteOffer', () => {
    /**
     * @description Vérifie que la suppression d'une offre invalide correctement le cache public.
     */
    it('doit invalider le cache public après la suppression', async () => {
      // Arrange
      const offerId = '1';
      offerRepository.delete.mockResolvedValue({ offer_id: offerId });

      // Act
      await offerService.deleteOffer(offerId);

      // Assert
      expect(offerRepository.delete).toHaveBeenCalledWith(offerId);
      expect(redisClient.del).toHaveBeenCalledWith('offers:public');
    });
  });
});
