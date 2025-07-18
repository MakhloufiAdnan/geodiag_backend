import { jest, describe, it, expect, beforeEach } from '@jest/globals';

/**
 * @file Tests unitaires pour LicenseService.
 * @description Valide la logique de création de licence, notamment le calcul de la date
 * d'expiration et la génération de la charge utile du QR code.
 */

// Mocker le repository pour isoler le service
jest.unstable_mockModule('../../src/repositories/licenseRepository.js', () => ({
    default: {
        create: jest.fn(),
    },
}));

const { default: licenseRepository } = await import('../../src/repositories/licenseRepository.js');
const { default: licenseService } = await import('../../src/services/licenseService.js');

describe('LicenseService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    /**
     * @describe Suite de tests pour la méthode createLicenseForOrder.
     */
    describe('createLicenseForOrder', () => {

        /**
         * @it Doit appeler le repository avec une date d'expiration correctement calculée et un QR code formaté.
         */
        it('doit calculer la date d\'expiration et générer un QR code', async () => {

        // Arrange
        const order = { order_id: 'order-1', company_id: 'co-1' };
        const offer = { duration_months: 12 };
        const mockDbClient = {}; // Simule un client de BDD transactionnel
        licenseRepository.create.mockResolvedValue({});

        // Act
        await licenseService.createLicenseForOrder(order, offer, mockDbClient);

        // Assert
        expect(licenseRepository.create).toHaveBeenCalledTimes(1);
        const createCallArg = licenseRepository.create.mock.calls[0][0];
        
        // Vérifie que la date d'expiration est dans le futur
        const expectedExpiration = new Date();
        expectedExpiration.setMonth(expectedExpiration.getMonth() + 12);
        
        expect(createCallArg.expires_at).toBeInstanceOf(Date);

        // Vérifie que la date est correcte à plus ou moins une minute près pour éviter les faux négatifs
        expect(createCallArg.expires_at.getTime()).toBeCloseTo(expectedExpiration.getTime(), -4);

        // Vérifie que le QR code a été généré avec le bon format
        expect(createCallArg.qr_code_payload).toMatch(/^LIC-co-1-/);
        });
    });
});