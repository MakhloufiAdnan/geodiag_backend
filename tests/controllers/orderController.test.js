import { jest, describe, it, expect, beforeEach } from '@jest/globals';

/**
 * @file Tests unitaires pour OrderController.
 * @description Valide la logique du contrôleur pour la création de commandes.
 */

jest.unstable_mockModule('../../src/services/orderService.js', () => ({
    default: {
        createOrder: jest.fn(),
    },
}));

const { default: orderService } = await import('../../src/services/orderService.js');
const { default: orderController } = await import('../../src/controllers/orderController.js');

describe('OrderController', () => {
    let mockReq, mockRes, mockNext;

    beforeEach(() => {
        mockReq = {
        body: {},
        user: { role: 'admin' },
        };
        mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        };
        mockNext = jest.fn();
        jest.clearAllMocks();
    });

    describe('createOrder', () => {
        it('doit retourner 201 et la nouvelle commande en cas de succès', async () => {

        // Arrange
        const offerId = 'offer-uuid-123';
        const newOrder = { orderId: 'order-uuid-456', offerId };
        mockReq.body.offerId = offerId;
        orderService.createOrder.mockResolvedValue(newOrder);

        // Act
        await orderController.createOrder(mockReq, mockRes, mockNext);

        // Assert
        expect(orderService.createOrder).toHaveBeenCalledWith(offerId, mockReq.user);
        expect(mockRes.status).toHaveBeenCalledWith(201);
        expect(mockRes.json).toHaveBeenCalledWith(newOrder);
        });

        it('doit appeler next(error) si le service lève une erreur', async () => {
            
        // Arrange
        const fakeError = new Error('Offre non valide');
        orderService.createOrder.mockRejectedValue(fakeError);

        // Act
        await orderController.createOrder(mockReq, mockRes, mockNext);

        // Assert
        expect(mockNext).toHaveBeenCalledWith(fakeError);
        });
    });
});