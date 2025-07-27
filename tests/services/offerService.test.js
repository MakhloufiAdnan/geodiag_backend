import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { NotFoundException } from '../../src/exceptions/apiException.js';
import { mockOffer } from '../../mocks/mockData.js';

/**
 * @file Tests unitaires complets pour OfferService.
 * @description Valide la logique métier, la gestion du cache et les cas d'erreur.
 */

jest.unstable_mockModule('../../src/repositories/offerRepository.js', () => ({
  default: {
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
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllOffers', () => {
    /**
     * @it Doit retourner les données de la BDD si le cache Redis échoue.
     */
    it('doit retourner les données de la BDD si le cache Redis échoue', async () => {
      // Arrange
      redisClient.get.mockRejectedValue(new Error('Redis connection error'));
      offerRepository.findAllPublic.mockResolvedValue([mockOffer]);

      // Act
      const result = await offerService.getAllOffers();

      // Assert
      expect(offerRepository.findAllPublic).toHaveBeenCalledTimes(1);
      expect(result[0].name).toBe(mockOffer.name);
    });
  });

  describe('createOffer', () => {
    /**
     * @it Doit appeler le repository pour créer une offre et invalider le cache.
     */
    it('doit invalider le cache après la création', async () => {
      // Arrange
      const offerData = { name: 'New Offer' };
      offerRepository.create.mockResolvedValue({ offer_id: '2', ...offerData });

      // Act
      await offerService.createOffer(offerData);

      // Assert
      expect(offerRepository.create).toHaveBeenCalledWith(offerData);
      expect(redisClient.del).toHaveBeenCalledWith('offers:all');
    });
  });

  describe('updateOffer', () => {
    /**
     * @it Doit mettre à jour une offre et invalider le cache.
     */
    it('doit invalider le cache après la mise à jour', async () => {
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
      expect(redisClient.del).toHaveBeenCalledWith('offers:all');
    });

    /**
     * @it Doit lever une NotFoundException si l'offre à mettre à jour n'existe pas.
     */
    it("doit lever une NotFoundException si l'offre à mettre à jour n'existe pas", async () => {
      // Arrange
      offerRepository.update.mockResolvedValue(null);

      // Act & Assert
      await expect(
        offerService.updateOffer('non-existent-id', {})
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteOffer', () => {
    /**
     * @it Doit supprimer une offre et invalider le cache.
     */
    it('doit invalider le cache après la suppression', async () => {
      // Arrange
      const offerId = '1';
      offerRepository.delete.mockResolvedValue({ offer_id: offerId });

      // Act
      await offerService.deleteOffer(offerId);

      // Assert
      expect(offerRepository.delete).toHaveBeenCalledWith(offerId);
      expect(redisClient.del).toHaveBeenCalledWith('offers:all');
    });
  });
});
