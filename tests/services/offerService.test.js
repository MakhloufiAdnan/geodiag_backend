import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { ForbiddenException, NotFoundException } from '../../src/exceptions/apiException.js';

/**
 * @file Tests unitaires pour OfferService.
 * @description Valide la logique métier, d'autorisation et de gestion du cache.
 */

// 1. Mocker les dépendances
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

// 2. Imports après les mocks
const { default: offerRepository } = await import('../../src/repositories/offerRepository.js');
const { default: redisClient } = await import('../../src/config/redisClient.js');
const { default: offerService } = await import('../../src/services/offerService.js');

describe('OfferService', () => {
    const mockAdminUser = { role: 'admin' };
    const mockNonAdminUser = { role: 'technician' };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getAllOffers', () => {
        it('doit retourner les données du cache si elles existent (CACHE HIT)', async () => {

        // Arrange
        const cachedData = [{ name: 'Cached Offer' }];
        redisClient.get.mockResolvedValue(JSON.stringify(cachedData));

        // Act
        const result = await offerService.getAllOffers(mockAdminUser);

        // Assert
        expect(redisClient.get).toHaveBeenCalledWith('offers:all');
        expect(offerRepository.findAllPublic).not.toHaveBeenCalled();
        expect(result).toEqual(cachedData);
        });

        it('doit récupérer les données de la BDD et les mettre en cache (CACHE MISS)', async () => {

        // Arrange
        const dbData = [{ offer_id: '1', name: 'DB Offer' }];
        redisClient.get.mockResolvedValue(null);
        offerRepository.findAllPublic.mockResolvedValue(dbData);

        // Act
        const result = await offerService.getAllOffers(mockAdminUser);

        // Assert
        expect(redisClient.get).toHaveBeenCalledWith('offers:all');
        expect(offerRepository.findAllPublic).toHaveBeenCalled();
        expect(redisClient.set).toHaveBeenCalled();
        expect(result[0].name).toBe('DB Offer');
        });

        it('doit lever une ForbiddenException si appelé par un non-admin', async () => {

            // Arrange
            const action = () => offerService.getAllOffers(mockNonAdminUser);

            // Act & Assert
            await expect(action).rejects.toThrow(ForbiddenException);
        });
    });

    describe('createOffer', () => {
        it('doit invalider le cache après la création', async () => {

        // Arrange
        const offerData = { name: 'New Offer' };
        offerRepository.create.mockResolvedValue({ offer_id: '2', ...offerData });

        // Act
        await offerService.createOffer(offerData, mockAdminUser);

        // Assert
        expect(offerRepository.create).toHaveBeenCalledWith(offerData);
        expect(redisClient.del).toHaveBeenCalledWith('offers:all');
        });

        it('doit lever une ForbiddenException si appelé par un non-admin', async () => {

            // Arrange
            const action = () => offerService.createOffer({}, mockNonAdminUser);

            // Act & Assert
            await expect(action).rejects.toThrow(ForbiddenException);
        });
    });

    describe('updateOffer', () => {
        it('doit invalider le cache après la mise à jour', async () => {

        // Arrange
        const offerId = '1';
        const offerData = { name: 'Updated Offer' };
        offerRepository.update.mockResolvedValue({ offer_id: offerId, ...offerData });

        // Act
        await offerService.updateOffer(offerId, offerData, mockAdminUser);

        // Assert
        expect(offerRepository.update).toHaveBeenCalledWith(offerId, offerData);
        expect(redisClient.del).toHaveBeenCalledWith('offers:all');
        });

        it('doit lever une NotFoundException si l\'offre à mettre à jour n\'existe pas', async () => {

            // Arrange
            offerRepository.update.mockResolvedValue(null);
            const action = () => offerService.updateOffer('non-existent-id', {}, mockAdminUser);

            // Act & Assert
            await expect(action).rejects.toThrow(NotFoundException);
        });
    });

    describe('deleteOffer', () => {
        it('doit invalider le cache après la suppression', async () => {

        // Arrange
        const offerId = '1';
        offerRepository.delete.mockResolvedValue({ offer_id: offerId });

        // Act
        await offerService.deleteOffer(offerId, mockAdminUser);

        // Assert
        expect(offerRepository.delete).toHaveBeenCalledWith(offerId);
        expect(redisClient.del).toHaveBeenCalledWith('offers:all');
        });

        it('doit lever une NotFoundException si l\'offre à supprimer n\'existe pas', async () => {

            // Arrange
            offerRepository.delete.mockResolvedValue(null);
            const action = () => offerService.deleteOffer('non-existent-id', mockAdminUser);
            
            // Act & Assert
            await expect(action).rejects.toThrow(NotFoundException);
        });
    });
});