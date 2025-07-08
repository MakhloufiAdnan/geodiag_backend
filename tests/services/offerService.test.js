import { jest, describe, it, expect, beforeEach } from '@jest/globals';

/**
 * @file Tests unitaires pour OfferService
 * @description Valide la logique métier et d'autorisation du service des offres.
 * Chaque test suit le pattern Arrange-Act-Assert (AAA) pour une meilleure lisibilité.
 */

// 1. Mocker le repository pour isoler le service
jest.unstable_mockModule('../../src/repositories/offerRepository.js', () => ({
    default: {
        findAllPublic: jest.fn(),
        findById: jest.fn(),
    },
}));

// 2. Imports après les mocks
const { default: offerRepository } = await import('../../src/repositories/offerRepository.js');
const { default: offerService } = await import('../../src/services/offerService.js');

describe('OfferService', () => {
    
    // Définir des utilisateurs simulés pour les tests d'autorisation
    const mockAdminUser = { userId: 'admin-uuid', role: 'admin' };
    const mockTechnicianUser = { userId: 'tech-uuid', role: 'technician' };

    beforeEach(() => {
        jest.clearAllMocks(); // Réinitialiser les mocks avant chaque test
    });

    // --- Tests pour getAllOffers ---
    describe('getAllOffers', () => {
        it('Doit retourner une liste d\'offres si appelé par un admin', async () => {
            // Préparation (Arrange)
            const fakeOffers = [{ name: 'Offre Pro' }];
            offerRepository.findAllPublic.mockResolvedValue(fakeOffers);

            // Action (Act)
            await offerService.getAllOffers(mockAdminUser);

            // Assertion (Assert)
            expect(offerRepository.findAllPublic).toHaveBeenCalled();
        });

        it('Doit lever une erreur 403 si appelé par un technicien', async () => {
            // Préparation (Arrange)
            // L'action qui devrait échouer est définie ici.
            const action = () => offerService.getAllOffers(mockTechnicianUser);

            // Action & Assertion (Act & Assert)
            // Pour les tests d'exception, l'action et l'assertion sont combinées.
            await expect(action).rejects.toThrow('Accès refusé. Droits administrateur requis.');
        });

        it('Doit lever une erreur 403 si aucun utilisateur n\'est fourni', async () => {
            // Préparation (Arrange)
            const action = () => offerService.getAllOffers(null);

            // Action & Assertion (Act & Assert)
            await expect(action).rejects.toThrow('Accès refusé. Droits administrateur requis.');
        });
    });

    // --- Tests pour getOfferById ---
    describe('getOfferById', () => {
        const offerId = 'offer-uuid-123';

        it('Doit retourner une offre si appelé par un admin', async () => {
            // Préparation (Arrange)
            offerRepository.findById.mockResolvedValue({ offer_id: offerId });

            // Action (Act)
            await offerService.getOfferById(offerId, mockAdminUser);

            // Assertion (Assert)
            expect(offerRepository.findById).toHaveBeenCalledWith(offerId);
        });

        it('Doit lever une erreur 403 si appelé par un technicien', async () => {
            // Préparation (Arrange)
            const action = () => offerService.getOfferById(offerId, mockTechnicianUser);

            // Action & Assertion (Act & Assert)
            await expect(action).rejects.toThrow('Accès refusé. Droits administrateur requis.');
        });
    });
});
