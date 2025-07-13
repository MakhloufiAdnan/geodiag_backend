import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { NotFoundException, ForbiddenException } from '../../src/exceptions/apiException.js';

// Mocker les dépendances
jest.unstable_mockModule('../../src/repositories/orderRepository.js', () => ({
    default: { create: jest.fn() }
}));
jest.unstable_mockModule('../../src/services/offerService.js', () => ({
    default: { getOfferById: jest.fn() }
}));

// Imports après les mocks
const { default: orderRepository } = await import('../../src/repositories/orderRepository.js');
const { default: offerService } = await import('../../src/services/offerService.js');
const { default: orderService } = await import('../../src/services/orderService.js');

describe('OrderService', () => {
    const mockAdminUser = { userId: 'admin-uuid', companyId: 'company-A', role: 'admin' };
    const mockTechnicianUser = { userId: 'tech-uuid', companyId: 'company-A', role: 'technician' };
    const mockOffer = { offer_id: 'offer-abc', price: 150.00 };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('createOrder', () => {
        it('doit créer une commande si appelé par un admin avec une offre valide', async () => {
            offerService.getOfferById.mockResolvedValue(mockOffer);
            orderRepository.create.mockResolvedValue({ order_id: 'new-order-id', ...mockOffer });

            await orderService.createOrder(mockOffer.offer_id, mockAdminUser);

            expect(orderRepository.create).toHaveBeenCalled();
            // Vérifie que le montant et l'ID de compagnie sont corrects
            const createCallArg = orderRepository.create.mock.calls[0][0];
            expect(createCallArg.amount).toBe(mockOffer.price);
            expect(createCallArg.company_id).toBe(mockAdminUser.companyId);
        });

        it("doit lever une ForbiddenException si appelé par un technicien", async () => {
            const action = () => orderService.createOrder(mockOffer.offer_id, mockTechnicianUser);
            await expect(action).rejects.toThrow(ForbiddenException);
        });

        it("doit lever une NotFoundException si l'offerId n'existe pas", async () => {
            // Simuler que le service des offres ne trouve rien
            offerService.getOfferById.mockResolvedValue(null);
            
            const action = () => orderService.createOrder('non-existent-offer', mockAdminUser);
            
            await expect(action).rejects.toThrow(NotFoundException);
        });
    });
});
