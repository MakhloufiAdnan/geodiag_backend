import { jest, describe, it, expect, beforeEach } from '@jest/globals';

/**
 * @file Tests unitaires pour PaymentController.
 * @description Valide la logique du contrôleur pour l'initiation des paiements.
 */

jest.unstable_mockModule('../../src/services/paymentService.js', () => ({
    default: {
        createCheckoutSession: jest.fn(),
    },
}));

const { default: paymentService } = await import('../../src/services/paymentService.js');
const { default: paymentController } = await import('../../src/controllers/paymentController.js');

describe('PaymentController', () => {
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

    describe('createCheckoutSession', () => {
        it('doit retourner 200 et la session de paiement en cas de succès', async () => {
            
        // Arrange
        const orderId = 'order-uuid-123';
        const session = { sessionId: 'cs_test_123', url: 'https://checkout.stripe.com/...' };
        mockReq.body.orderId = orderId;
        paymentService.createCheckoutSession.mockResolvedValue(session);

        // Act
        await paymentController.createCheckoutSession(mockReq, mockRes, mockNext);

        // Assert
        expect(paymentService.createCheckoutSession).toHaveBeenCalledWith(orderId, mockReq.user);
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith(session);
        });
    });
});