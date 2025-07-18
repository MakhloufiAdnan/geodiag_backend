import { jest, describe, it, expect, beforeEach } from '@jest/globals';

/**
 * @file Tests unitaires pour EmailService.
 * @description Valide que le service d'email tente d'envoyer des emails avec les bons paramètres,
 * sans réellement envoyer d'email grâce au mock de nodemailer.
 */

// Mocker nodemailer pour intercepter les appels à sendMail
const mockSendMail = jest.fn();
jest.unstable_mockModule('nodemailer', () => ({
    default: {
        createTransport: () => ({
        sendMail: mockSendMail,
        }),
    },
}));

const { default: emailService } = await import('../../src/services/emailService.js');

describe('EmailService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockSendMail.mockClear();
    });

    /**
     * @describe Suite de tests pour la méthode sendLicenseAndInvoice.
     */
    describe('sendLicenseAndInvoice', () => {

        /**
         * @it Doit appeler la méthode sendMail du transporteur avec les bons arguments formatés.
         */
        it('doit appeler sendMail avec les bons arguments', async () => {
            
        // Arrange
        const company = { email: 'client@test.com', name: 'Client Corp' };
        const license = { expires_at: new Date(), qr_code_payload: 'QR-123', order_id: 'order-abc' };
        const invoicePdfBuffer = Buffer.from('fake-pdf');
        mockSendMail.mockResolvedValue(true); // Simule un envoi réussi

        // Act
        await emailService.sendLicenseAndInvoice(company, license, invoicePdfBuffer);

        // Assert
        expect(mockSendMail).toHaveBeenCalledTimes(1);
        const mailOptions = mockSendMail.mock.calls[0][0];
        expect(mailOptions.to).toBe(company.email);
        expect(mailOptions.subject).toContain(company.name);
        expect(mailOptions.attachments[0].filename).toBe(`facture-geodiag-${license.order_id}.pdf`);
        expect(mailOptions.attachments[0].content).toBe(invoicePdfBuffer);
        });
    });
});