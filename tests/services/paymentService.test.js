import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { ForbiddenException, NotFoundException, ApiException } from '../../src/exceptions/apiException.js';

// Mocker toutes les dépendances du service
jest.unstable_mockModule('../../src/repositories/orderRepository.js', () => ({
    default: { findById: jest.fn(), updateStatus: jest.fn() }
}));
jest.unstable_mockModule('../../src/repositories/paymentRepository.js', () => ({
    default: { create: jest.fn() }
}));
jest.unstable_mockModule('../../src/repositories/companyRepository.js', () => ({
    default: { findById: jest.fn() }
}));
jest.unstable_mockModule('../../src/repositories/offerRepository.js', () => ({
    default: { findById: jest.fn() }
}));
jest.unstable_mockModule('../../src/services/licenseService.js', () => ({
    default: { createLicenseForOrder: jest.fn() }
}));
jest.unstable_mockModule('../../src/services/emailService.js', () => ({
    default: { sendLicenseAndInvoice: jest.fn() }
}));
jest.unstable_mockModule('../../src/db/index.js', () => ({
    pool: {
        connect: jest.fn(() => ({
            query: jest.fn(),
            release: jest.fn(),
        })),
    },
    db: {
        query: jest.fn(),
    }
}));
jest.unstable_mockModule('stripe', () => ({
    default: jest.fn(() => ({
        checkout: { sessions: { create: jest.fn() } },
    })),
}));

// Imports après les mocks
const { default: orderRepository } = await import('../../src/repositories/orderRepository.js');
const { default: offerRepository } = await import('../../src/repositories/offerRepository.js');
const { default: companyRepository } = await import('../../src/repositories/companyRepository.js');
const { default: licenseService } = await import('../../src/services/licenseService.js');
const { default: emailService } = await import('../../src/services/emailService.js');
const { default: paymentService } = await import('../../src/services/paymentService.js');
const { pool } = await import('../../src/db/index.js');

describe('PaymentService', () => {
    const mockAdminUser = { userId: 'admin-uuid', companyId: 'company-A', role: 'admin' };
    const mockOrder = { order_id: 'order-123', company_id: 'company-A', offer_id: 'offer-abc' };
    const mockOffer = { name: 'Test Offer', price: 100.00 };
    const mockCompany = { email: 'test@co.com', name: 'Test Co' };
    const mockLicense = { license_id: 'lic-123', order_id: 'order-123' };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('createCheckoutSession', () => {
        it("doit lever une NotFoundException si la commande n'existe pas", async () => {
            orderRepository.findById.mockResolvedValue(null);
            const action = () => paymentService.createCheckoutSession('non-existent-id', mockAdminUser);
            await expect(action).rejects.toThrow(NotFoundException);
        });

        it("doit lever une ForbiddenException si un admin paie pour une commande d'une autre compagnie", async () => {
            const orderFromAnotherCompany = { ...mockOrder, company_id: 'company-B' };
            orderRepository.findById.mockResolvedValue(orderFromAnotherCompany);
            const action = () => paymentService.createCheckoutSession(mockOrder.order_id, mockAdminUser);
            await expect(action).rejects.toThrow(ForbiddenException);
        });
    });

    describe('handleSuccessfulPayment', () => {
        it('doit exécuter toutes les étapes dans une transaction', async () => {
            const mockSession = { metadata: { orderId: 'order-123' }, payment_intent: 'pi_123', amount_total: 10000 };
            const mockClient = { query: jest.fn(), release: jest.fn() };
            pool.connect.mockResolvedValue(mockClient);
            orderRepository.updateStatus.mockResolvedValue(mockOrder);
            offerRepository.findById.mockResolvedValue(mockOffer);
            licenseService.createLicenseForOrder.mockResolvedValue(mockLicense);
            companyRepository.findById.mockResolvedValue(mockCompany);

            await paymentService.processSuccessfulPayment(mockSession);

            expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
            expect(orderRepository.updateStatus).toHaveBeenCalledWith('order-123', 'completed', mockClient);
            expect(licenseService.createLicenseForOrder).toHaveBeenCalled();
            expect(emailService.sendLicenseAndInvoice).toHaveBeenCalled();
            expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
            expect(mockClient.release).toHaveBeenCalled();
        });

        it('doit exécuter un ROLLBACK si une étape échoue', async () => {
            const mockSession = { metadata: { orderId: 'order-123' } };
            const mockClient = { query: jest.fn(), release: jest.fn() };
            pool.connect.mockResolvedValue(mockClient);
            orderRepository.updateStatus.mockRejectedValue(new Error('DB error'));

            const action = () => paymentService.processSuccessfulPayment(mockSession);

            await expect(action).rejects.toThrow(ApiException);
            expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
            expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
            expect(mockClient.release).toHaveBeenCalled();
        });
    });
});
