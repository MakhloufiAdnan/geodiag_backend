import { jest, describe, it, expect, beforeEach } from '@jest/globals';

/**
 * @file Tests unitaires pour OfferController.
 * @description Valide que le contrôleur appelle le service des offres et gère les réponses.
 */

// 1. Mocker le service pour isoler le contrôleur
jest.unstable_mockModule('../../src/services/offerService.js', () => ({
    default: {
        getAllOffers: jest.fn(),
    },
}));

// 2. Importer les modules après le mock
const { default: offerService } = await import('../../src/services/offerService.js');
const { default: offerController } = await import('../../src/controllers/offerController.js');

describe('OfferController', () => {
    let mockReq, mockRes, mockNext;

    beforeEach(() => {
        mockReq = { user: { role: 'admin' } };
        mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        };
        mockNext = jest.fn();
        jest.clearAllMocks();
    });

    describe('getAllOffers', () => {
        it('doit retourner 200 et la liste des offres en cas de succès', async () => {

        // Arrange
        const fakeOffers = [{ id: 'offer-1', name: 'Basic Plan' }];
        offerService.getAllOffers.mockResolvedValue(fakeOffers);

        // Act
        await offerController.getAllOffers(mockReq, mockRes, mockNext);

        // Assert
        expect(offerService.getAllOffers).toHaveBeenCalledWith(mockReq.user);
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith(fakeOffers);
        expect(mockNext).not.toHaveBeenCalled();
        });

        it('doit appeler next(error) si le service lève une erreur', async () => {
            
        // Arrange
        const fakeError = new Error('Erreur de service');
        offerService.getAllOffers.mockRejectedValue(fakeError);

        // Act
        await offerController.getAllOffers(mockReq, mockRes, mockNext);

        // Assert
        expect(mockNext).toHaveBeenCalledWith(fakeError);
        });
    });
});