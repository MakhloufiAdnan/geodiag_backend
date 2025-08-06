import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { NotFoundException } from '../../src/exceptions/ApiException.js';
import { mockOffer } from '../../mocks/mockData.js';
import { OfferDto } from '../../src/dtos/offerDto.js';

/**
 * @file Tests unitaires complets pour OfferService.
 * @description Valide toute la logique métier du service, y compris la gestion du cache,
 * les cas de succès et les cas d'erreur pour les opérations CRUD, en suivant
 * rigoureusement le pattern Arrange-Act-Assert pour une couverture de 100%.
 */

// --- MOCKING DES DÉPENDANCES ---
const mockOfferRepositoryFindAll = jest.fn();
const mockOfferRepositoryFindAllPublic = jest.fn();
const mockOfferRepositoryFindById = jest.fn();
const mockOfferRepositoryCreate = jest.fn();
const mockOfferRepositoryUpdate = jest.fn();
const mockOfferRepositoryDelete = jest.fn();

jest.unstable_mockModule('../../src/repositories/offerRepository.js', () => ({
  default: {
    findAll: mockOfferRepositoryFindAll,
    findAllPublic: mockOfferRepositoryFindAllPublic,
    findById: mockOfferRepositoryFindById,
    create: mockOfferRepositoryCreate,
    update: mockOfferRepositoryUpdate,
    delete: mockOfferRepositoryDelete,
  },
}));

const mockRedisClientGet = jest.fn();
const mockRedisClientSet = jest.fn();
const mockRedisClientDel = jest.fn();
jest.unstable_mockModule('../../src/config/redisClient.js', () => ({
  default: {
    get: mockRedisClientGet,
    set: mockRedisClientSet,
    del: mockRedisClientDel,
  },
}));

const mockLoggerInfo = jest.fn();
const mockLoggerError = jest.fn();
jest.unstable_mockModule('../../src/config/logger.js', () => ({
  default: { info: mockLoggerInfo, error: mockLoggerError },
}));

// --- IMPORTS APRÈS LES MOCKS ---
const { default: offerService } = await import(
  '../../src/services/offerService.js'
);

/**
 * Suite de tests pour le service d'offres (OfferService).
 * @module OfferServiceTests
 */
describe('OfferService', () => {
  /**
   * Exécuté avant chaque test.
   * Réinitialise tous les mocks Jest.
   */
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Suite de tests pour la méthode `getAllPublicOffers`.
   * @memberof OfferServiceTests
   */
  describe('getAllPublicOffers', () => {
    /**
     * Teste la récupération des offres depuis le cache (cache hit).
     * @test
     */
    it('doit retourner les offres depuis le cache si disponibles (cache hit)', async () => {
      // Arrange
      const cachedOffers = [new OfferDto(mockOffer)];
      mockRedisClientGet.mockResolvedValue(JSON.stringify(cachedOffers));

      // Act
      const result = await offerService.getAllPublicOffers();

      // Assert
      expect(mockRedisClientGet).toHaveBeenCalledWith('offers:public');
      expect(mockOfferRepositoryFindAllPublic).not.toHaveBeenCalled();
      expect(mockLoggerInfo).toHaveBeenCalledWith(
        'CACHE HIT pour les offres publiques'
      );
      expect(result).toEqual(cachedOffers);
    });

    /**
     * Teste la récupération des offres depuis la BDD et leur mise en cache (cache miss).
     * @test
     */
    it('doit retourner les offres de la BDD et les mettre en cache (cache miss)', async () => {
      // Arrange
      mockRedisClientGet.mockResolvedValue(null); // Simule un cache miss
      mockOfferRepositoryFindAllPublic.mockResolvedValue([mockOffer]);
      const expectedCachedDto = new OfferDto(mockOffer); // Crée le DTO attendu

      // Act
      const result = await offerService.getAllPublicOffers();

      // Assert
      expect(mockRedisClientGet).toHaveBeenCalledWith('offers:public');
      expect(mockOfferRepositoryFindAllPublic).toHaveBeenCalledTimes(1);
      expect(mockRedisClientSet).toHaveBeenCalledWith(
        'offers:public',
        JSON.stringify([expectedCachedDto]), // Attendre le format DTO
        'EX',
        3600 // CACHE_TTL_SECONDS
      );
      expect(mockLoggerInfo).toHaveBeenCalledWith(
        'CACHE MISS pour les offres publiques. Récupération depuis la BDD.'
      );
      expect(result[0].name).toBe(mockOffer.name);
      expect(result[0]).toEqual(expectedCachedDto); // Assurer que le résultat est bien le DTO
    });

    /**
     * Teste que les données sont retournées de la BDD même si l'écriture dans le cache échoue.
     * @test
     */
    it("doit retourner les données de la BDD même si l'écriture dans le cache échoue", async () => {
      // Arrange
      mockRedisClientGet.mockResolvedValue(null);
      mockRedisClientSet.mockRejectedValue(new Error('Redis write error')); // Simule un échec d'écriture cache
      mockOfferRepositoryFindAllPublic.mockResolvedValue([mockOffer]);
      const expectedResultDto = new OfferDto(mockOffer); // Crée le DTO attendu pour le retour

      // Act
      const result = await offerService.getAllPublicOffers();

      // Assert
      expect(mockRedisClientGet).toHaveBeenCalledWith('offers:public');
      expect(mockOfferRepositoryFindAllPublic).toHaveBeenCalledTimes(1);
      expect(mockRedisClientSet).toHaveBeenCalled(); // L'appel est fait
      expect(mockLoggerError).toHaveBeenCalledWith(
        expect.any(Object),
        "Erreur lors de l'écriture dans le cache Redis."
      );
      expect(result[0].name).toBe(mockOffer.name);
      expect(result[0]).toEqual(expectedResultDto); // Assurer que le résultat est bien le DTO
    });

    /**
     * Teste que les données sont retournées de la BDD même si la lecture du cache échoue.
     * @test
     */
    it('doit retourner les données de la BDD même si la lecture du cache échoue', async () => {
      // Arrange
      mockRedisClientGet.mockRejectedValue(new Error('Redis read error')); // Simule un échec de lecture cache
      mockOfferRepositoryFindAllPublic.mockResolvedValue([mockOffer]);
      const expectedResultDto = new OfferDto(mockOffer); // Crée le DTO attendu pour le retour

      // Act
      const result = await offerService.getAllPublicOffers();

      // Assert
      expect(mockRedisClientGet).toHaveBeenCalledWith('offers:public');
      expect(mockLoggerError).toHaveBeenCalledWith(
        expect.any(Object),
        'Erreur lors de la lecture du cache Redis.'
      );
      expect(mockOfferRepositoryFindAllPublic).toHaveBeenCalledTimes(1); // La BDD est consultée
      expect(mockRedisClientSet).toHaveBeenCalled(); // L'écriture dans le cache est tentée après la BDD
      expect(result[0].name).toBe(mockOffer.name);
      expect(result[0]).toEqual(expectedResultDto); // Assurer que le résultat est bien le DTO
    });
  });

  /**
   * Suite de tests pour la méthode `getAllOffers`.
   * @memberof OfferServiceTests
   */
  describe('getAllOffers', () => {
    /**
     * Teste la récupération de toutes les offres pour le superAdmin.
     * @test
     */
    it('doit retourner toutes les offres depuis le repository pour le superAdmin', async () => {
      // Arrange
      const allOffers = [
        mockOffer,
        { ...mockOffer, offer_id: 'offer-2', is_public: false },
      ];
      mockOfferRepositoryFindAll.mockResolvedValue(allOffers);
      const expectedResultDtos = allOffers.map((offer) => new OfferDto(offer)); // Mapper aussi ici

      // Act
      const result = await offerService.getAllOffers();

      // Assert
      expect(mockOfferRepositoryFindAll).toHaveBeenCalledTimes(1);
      expect(result.length).toBe(2);
      expect(result).toEqual(expectedResultDtos); // Comparer directement les DTOs
    });
  });

  /**
   * Suite de tests pour la méthode `getOfferById`.
   * @memberof OfferServiceTests
   */
  describe('getOfferById', () => {
    /**
     * Teste la récupération réussie d'une offre par ID.
     * @test
     */
    it('doit retourner une offre si elle est trouvée', async () => {
      // Arrange
      mockOfferRepositoryFindById.mockResolvedValue(mockOffer);

      // Act
      const result = await offerService.getOfferById(mockOffer.offer_id);

      // Assert
      expect(mockOfferRepositoryFindById).toHaveBeenCalledWith(
        mockOffer.offer_id
      );
      expect(result).toEqual(mockOffer);
    });

    /**
     * Teste la levée d'une `NotFoundException` si l'offre n'est pas trouvée par ID.
     * @test
     */
    it("doit lever une NotFoundException si l'offre n'est pas trouvée", async () => {
      // Arrange
      mockOfferRepositoryFindById.mockResolvedValue(null);

      // Act & Assert
      await expect(offerService.getOfferById('id-inexistant')).rejects.toThrow(
        NotFoundException
      );
      expect(mockOfferRepositoryFindById).toHaveBeenCalledWith('id-inexistant');
    });
  });

  /**
   * Suite de tests pour la méthode `createOffer`.
   * @memberof OfferServiceTests
   */
  describe('createOffer', () => {
    /**
     * Teste la création réussie d'une nouvelle offre et l'invalidation du cache.
     * @test
     */
    it('doit retourner la nouvelle offre et invalider le cache en cas de succès', async () => {
      // Arrange
      const offerData = {
        name: 'New Offer',
        price: 100,
        duration_days: 30,
        is_public: true,
      };
      const newOffer = { offer_id: 'new-offer-id', ...offerData };
      mockOfferRepositoryCreate.mockResolvedValue(newOffer);
      mockRedisClientDel.mockResolvedValue(1); // Simule la suppression réussie du cache
      const expectedResultDto = new OfferDto(newOffer); // Crée le DTO attendu

      // Act
      const result = await offerService.createOffer(offerData);

      // Assert
      expect(mockOfferRepositoryCreate).toHaveBeenCalledWith(offerData);
      expect(mockRedisClientDel).toHaveBeenCalledWith('offers:public');
      expect(mockLoggerInfo).toHaveBeenCalledWith(
        'Invalidating cache for key: offers:public'
      );
      expect(result).toEqual(expectedResultDto); // Vérifie le DTO complet
    });

    /**
     * Teste que l'offre est créée même si l'invalidation du cache échoue.
     * @test
     */
    it("doit créer l'offre même si l'invalidation du cache échoue", async () => {
      // Arrange
      const offerData = {
        name: 'New Offer',
        price: 100,
        duration_days: 30,
        is_public: true,
      };
      const newOffer = { offer_id: 'new-offer-id', ...offerData };
      mockOfferRepositoryCreate.mockResolvedValue(newOffer);
      mockRedisClientDel.mockRejectedValue(new Error('Redis delete error')); // Simule un échec d'invalidation
      const expectedResultDto = new OfferDto(newOffer); // Crée le DTO attendu

      // Act
      const result = await offerService.createOffer(offerData);

      // Assert
      expect(mockOfferRepositoryCreate).toHaveBeenCalledWith(offerData);
      expect(mockRedisClientDel).toHaveBeenCalledWith('offers:public');
      expect(mockLoggerError).toHaveBeenCalledWith(
        expect.any(Object),
        "Erreur lors de l'invalidation du cache des offres publiques."
      );
      expect(result).toEqual(expectedResultDto);
    });
  });

  /**
   * Suite de tests pour la méthode `updateOffer`.
   * @memberof OfferServiceTests
   */
  describe('updateOffer', () => {
    /**
     * Teste la mise à jour réussie d'une offre et l'invalidation du cache.
     * @test
     */
    it("doit retourner l'offre mise à jour et invalider le cache en cas de succès", async () => {
      // Arrange
      const updatedData = { ...mockOffer, name: 'Nouveau Nom' };
      mockOfferRepositoryUpdate.mockResolvedValue(updatedData);
      mockRedisClientDel.mockResolvedValue(1);
      const expectedResultDto = new OfferDto(updatedData); // Crée le DTO attendu

      // Act
      const result = await offerService.updateOffer(mockOffer.offer_id, {
        name: 'Nouveau Nom',
      });

      // Assert
      expect(mockOfferRepositoryUpdate).toHaveBeenCalledWith(
        mockOffer.offer_id,
        { name: 'Nouveau Nom' }
      );
      expect(mockRedisClientDel).toHaveBeenCalledWith('offers:public');
      expect(mockLoggerInfo).toHaveBeenCalledWith(
        'Invalidating cache for key: offers:public'
      );
      expect(result).toEqual(expectedResultDto); // Vérifie le DTO complet
    });

    /**
     * Teste la levée d'une `NotFoundException` si l'offre à mettre à jour n'est pas trouvée.
     * @test
     */
    it("doit lever une NotFoundException si l'offre à mettre à jour n'est pas trouvée", async () => {
      // Arrange
      mockOfferRepositoryUpdate.mockResolvedValue(null);

      // Act & Assert
      await expect(
        offerService.updateOffer('id-inexistant', { name: 'Nouveau Nom' })
      ).rejects.toThrow(NotFoundException);
      expect(mockOfferRepositoryUpdate).toHaveBeenCalledWith('id-inexistant', {
        name: 'Nouveau Nom',
      });
      expect(mockRedisClientDel).not.toHaveBeenCalled(); // Pas d'invalidation si l'offre n'est pas trouvée
    });

    /**
     * Teste que l'offre est mise à jour même si l'invalidation du cache échoue.
     * @test
     */
    it("doit mettre à jour l'offre même si l'invalidation du cache échoue", async () => {
      // Arrange
      const updatedData = { ...mockOffer, name: 'Nouveau Nom' };
      mockOfferRepositoryUpdate.mockResolvedValue(updatedData);
      mockRedisClientDel.mockRejectedValue(new Error('Redis delete error')); // Simule un échec d'invalidation
      const expectedResultDto = new OfferDto(updatedData); // Crée le DTO attendu

      // Act
      const result = await offerService.updateOffer(mockOffer.offer_id, {
        name: 'Nouveau Nom',
      });

      // Assert
      expect(mockOfferRepositoryUpdate).toHaveBeenCalledWith(
        mockOffer.offer_id,
        { name: 'Nouveau Nom' }
      );
      expect(mockRedisClientDel).toHaveBeenCalledWith('offers:public');
      expect(mockLoggerError).toHaveBeenCalledWith(
        expect.any(Object),
        "Erreur lors de l'invalidation du cache des offres publiques."
      );
      expect(result).toEqual(expectedResultDto);
    });
  });

  /**
   * Suite de tests pour la méthode `deleteOffer`.
   * @memberof OfferServiceTests
   */
  describe('deleteOffer', () => {
    /**
     * Teste la suppression réussie d'une offre et l'invalidation du cache.
     * @test
     */
    it('doit retourner true et invalider le cache en cas de succès', async () => {
      // Arrange
      mockOfferRepositoryDelete.mockResolvedValue(mockOffer);
      mockRedisClientDel.mockResolvedValue(1);

      // Act
      const result = await offerService.deleteOffer(mockOffer.offer_id);

      // Assert
      expect(mockOfferRepositoryDelete).toHaveBeenCalledWith(
        mockOffer.offer_id
      );
      expect(mockRedisClientDel).toHaveBeenCalledWith('offers:public');
      expect(mockLoggerInfo).toHaveBeenCalledWith(
        'Invalidating cache for key: offers:public'
      );
      expect(result).toBe(true);
    });

    /**
     * Teste la levée d'une `NotFoundException` si l'offre à supprimer n'est pas trouvée.
     * @test
     */
    it("doit lever une NotFoundException si l'offre à supprimer n'est pas trouvée", async () => {
      // Arrange
      mockOfferRepositoryDelete.mockResolvedValue(null);

      // Act & Assert
      await expect(offerService.deleteOffer('id-inexistant')).rejects.toThrow(
        NotFoundException
      );
      expect(mockOfferRepositoryDelete).toHaveBeenCalledWith('id-inexistant');
      expect(mockRedisClientDel).not.toHaveBeenCalled(); // Pas d'invalidation si l'offre n'est pas trouvée
    });

    /**
     * Teste que l'offre est supprimée même si l'invalidation du cache échoue.
     * @test
     */
    it("doit supprimer l'offre même si l'invalidation du cache échoue", async () => {
      // Arrange
      mockOfferRepositoryDelete.mockResolvedValue(mockOffer);
      mockRedisClientDel.mockRejectedValue(new Error('Redis delete error')); // Simule un échec d'invalidation

      // Act
      const result = await offerService.deleteOffer(mockOffer.offer_id);

      // Assert
      expect(mockOfferRepositoryDelete).toHaveBeenCalledWith(
        mockOffer.offer_id
      );
      expect(mockRedisClientDel).toHaveBeenCalledWith('offers:public');
      expect(mockLoggerError).toHaveBeenCalledWith(
        expect.any(Object),
        "Erreur lors de l'invalidation du cache des offres publiques."
      );
      expect(result).toBe(true);
    });
  });
});
