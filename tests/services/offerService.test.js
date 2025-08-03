/**
 * @file Tests unitaires complets pour OfferService.
 * @description Valide toute la logique métier du service, y compris la gestion du cache,
 * les cas de succès et les cas d'erreur pour les opérations CRUD, en suivant
 * rigoureusement le pattern Arrange-Act-Assert pour une couverture de 100%.
 */
import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { NotFoundException } from '../../src/exceptions/ApiException.js';
import { mockOffer } from '../../mocks/mockData.js';

// --- MOCKING DES DÉPENDANCES ---
jest.unstable_mockModule('../../src/repositories/offerRepository.js', () => ({
  default: {
    findAll: jest.fn(),
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
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllPublicOffers', () => {
    it('doit retourner les offres depuis le cache si disponibles (cache hit)', async () => {
      // Arrange
      const cachedOffers = [mockOffer];
      redisClient.get.mockResolvedValue(JSON.stringify(cachedOffers));

      // Act
      const result = await offerService.getAllPublicOffers();

      // Assert
      expect(redisClient.get).toHaveBeenCalledWith('offers:public');
      expect(offerRepository.findAllPublic).not.toHaveBeenCalled();
      expect(result).toEqual(cachedOffers);
    });

    it('doit retourner les offres de la BDD et les mettre en cache (cache miss)', async () => {
      // Arrange
      redisClient.get.mockResolvedValue(null);
      offerRepository.findAllPublic.mockResolvedValue([mockOffer]);

      // Act
      const result = await offerService.getAllPublicOffers();

      // Assert
      expect(offerRepository.findAllPublic).toHaveBeenCalledTimes(1);
      expect(redisClient.set).toHaveBeenCalled();
      expect(result[0].name).toBe(mockOffer.name);
    });

    it("doit retourner les données de la BDD même si l'écriture dans le cache échoue", async () => {
      // Arrange
      redisClient.get.mockResolvedValue(null);
      redisClient.set.mockRejectedValue(new Error('Redis write error'));
      offerRepository.findAllPublic.mockResolvedValue([mockOffer]);

      // Act
      const result = await offerService.getAllPublicOffers();

      // Assert
      expect(offerRepository.findAllPublic).toHaveBeenCalledTimes(1);
      expect(result[0].name).toBe(mockOffer.name);
    });
  });

  describe('getAllOffers', () => {
    it('doit retourner toutes les offres depuis le repository pour le superAdmin', async () => {
      // Arrange
      const allOffers = [mockOffer, { ...mockOffer, is_public: false }];
      offerRepository.findAll.mockResolvedValue(allOffers);

      // Act
      const result = await offerService.getAllOffers();

      // Assert
      expect(offerRepository.findAll).toHaveBeenCalledTimes(1);
      expect(result.length).toBe(2);
    });
  });

  describe('getOfferById', () => {
    it('doit retourner une offre si elle est trouvée', async () => {
      // Arrange
      offerRepository.findById.mockResolvedValue(mockOffer);

      // Act
      const result = await offerService.getOfferById(mockOffer.offer_id);

      // Assert
      expect(result).toEqual(mockOffer);
    });

    it("doit lever une NotFoundException si l'offre n'est pas trouvée", async () => {
      // Arrange
      offerRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(offerService.getOfferById('id-inexistant')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('createOffer', () => {
    it('doit retourner la nouvelle offre et invalider le cache en cas de succès', async () => {
      // Arrange
      const offerData = { name: 'New Offer' };
      const newOffer = { offer_id: '2', ...offerData };
      offerRepository.create.mockResolvedValue(newOffer);

      // Act
      const result = await offerService.createOffer(offerData);

      // Assert
      expect(result.name).toBe('New Offer');
      expect(redisClient.del).toHaveBeenCalledWith('offers:public');
    });
  });

  describe('updateOffer', () => {
    it("doit retourner l'offre mise à jour et invalider le cache en cas de succès", async () => {
      // Arrange
      const updatedData = { ...mockOffer, name: 'Nouveau Nom' };
      offerRepository.update.mockResolvedValue(updatedData);

      // Act
      const result = await offerService.updateOffer(mockOffer.offer_id, {
        name: 'Nouveau Nom',
      });

      // Assert
      expect(result.name).toBe('Nouveau Nom');
      expect(redisClient.del).toHaveBeenCalledWith('offers:public');
    });

    it("doit lever une NotFoundException si l'offre à mettre à jour n'est pas trouvée", async () => {
      // Arrange
      offerRepository.update.mockResolvedValue(null);

      // Act & Assert
      await expect(
        offerService.updateOffer('id-inexistant', { name: 'Nouveau Nom' })
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteOffer', () => {
    it('doit retourner true et invalider le cache en cas de succès', async () => {
      // Arrange
      offerRepository.delete.mockResolvedValue(mockOffer);

      // Act
      const result = await offerService.deleteOffer(mockOffer.offer_id);

      // Assert
      expect(result).toBe(true);
      expect(redisClient.del).toHaveBeenCalledWith('offers:public');
    });

    it("doit lever une NotFoundException si l'offre à supprimer n'est pas trouvée", async () => {
      // Arrange
      offerRepository.delete.mockResolvedValue(null);

      // Act & Assert
      await expect(offerService.deleteOffer('id-inexistant')).rejects.toThrow(
        NotFoundException
      );
    });
  });
});
