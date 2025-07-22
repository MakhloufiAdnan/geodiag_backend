import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { NotFoundException } from '../../src/exceptions/apiException.js';
import { OfferDto } from '../../src/dtos/offerDto.js';

/**
 * @file Tests unitaires pour OfferService.
 * @description Valide la logique métier, d'autorisation et de gestion du cache pour les offres.
 */

// 1. Mocker les dépendances pour isoler le service.
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
    default: {
        get: jest.fn(),
        set: jest.fn(),
        del: jest.fn(),
    },
}));
jest.unstable_mockModule('../../src/config/logger.js', () => ({
    default: {
        info: jest.fn(),
        error: jest.fn(),
    },
}));

// 2. Imports dynamiques après la configuration des mocks.
const { default: offerRepository } = await import('../../src/repositories/offerRepository.js');
const { default: redisClient } = await import('../../src/config/redisClient.js');
const { default: offerService } = await import('../../src/services/offerService.js');

describe('OfferService', () => {
    const mockOffer = { offer_id: '1', name: 'DB Offer', price: 99.99, is_public: true };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getAllOffers', () => {
        it('doit retourner les données du cache si elles existent (CACHE HIT)', async () => {
            // Arrange
            const cachedData = [{ name: 'Cached Offer' }];
            redisClient.get.mockResolvedValue(JSON.stringify(cachedData));

            // Act
            const result = await offerService.getAllOffers();

            // Assert
            expect(redisClient.get).toHaveBeenCalledWith('offers:all');
            expect(offerRepository.findAllPublic).not.toHaveBeenCalled();
            expect(result).toEqual(cachedData);
        });

        it('doit récupérer les données de la BDD et les mettre en cache (CACHE MISS)', async () => {
            // Arrange
            redisClient.get.mockResolvedValue(null);
            offerRepository.findAllPublic.mockResolvedValue([mockOffer]);

            // Act
            const result = await offerService.getAllOffers();

            // Assert
            expect(redisClient.get).toHaveBeenCalledWith('offers:all');
            expect(offerRepository.findAllPublic).toHaveBeenCalled();
            expect(redisClient.set).toHaveBeenCalled();
            expect(result[0].name).toBe('DB Offer');
            expect(result[0]).toBeInstanceOf(OfferDto);
        });
    });

    describe('getOfferById', () => {
        it('doit retourner une offre si elle est trouvée', async () => {
            // Arrange
            offerRepository.findById.mockResolvedValue(mockOffer);

            // Act
            const result = await offerService.getOfferById('1');

            // Assert
            expect(offerRepository.findById).toHaveBeenCalledWith('1');
            expect(result).toEqual(mockOffer);
        });

        it('doit lever une NotFoundException si l\'offre n\'est pas trouvée', async () => {
            // Arrange
            offerRepository.findById.mockResolvedValue(null);

            // Act & Assert
            await expect(offerService.getOfferById('non-existent-id')).rejects.toThrow(NotFoundException);
        });
    });

    describe('createOffer', () => {
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
        it('doit invalider le cache après la mise à jour', async () => {
            // Arrange
            const offerId = '1';
            const offerData = { name: 'Updated Offer' };
            offerRepository.update.mockResolvedValue({ offer_id: offerId, ...offerData });

            // Act
            await offerService.updateOffer(offerId, offerData);

            // Assert
            expect(offerRepository.update).toHaveBeenCalledWith(offerId, offerData);
            expect(redisClient.del).toHaveBeenCalledWith('offers:all');
        });

        it('doit lever une NotFoundException si l\'offre à mettre à jour n\'existe pas', async () => {
            // Arrange
            offerRepository.update.mockResolvedValue(null);
            
            // Act & Assert
            await expect(offerService.updateOffer('non-existent-id', {})).rejects.toThrow(NotFoundException);
        });
    });

    describe('deleteOffer', () => {
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

        it('doit lever une NotFoundException si l\'offre à supprimer n\'existe pas', async () => {
            // Arrange
            offerRepository.delete.mockResolvedValue(null);
            
            // Act & Assert
            await expect(offerService.deleteOffer('non-existent-id')).rejects.toThrow(NotFoundException);
        });
    });
});
