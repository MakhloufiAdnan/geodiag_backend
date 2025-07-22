import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { ApiException } from '../../src/exceptions/apiException.js';

/**
 * @file Tests unitaires pour EmailService.
 * @description Valide que le service d'email tente d'envoyer des emails avec les bons paramètres
 * et gère correctement les succès et les échecs, sans réellement envoyer d'email grâce au mock de nodemailer.
 */

// Mocker nodemailer pour intercepter les appels à sendMail et contrôler son comportement.
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
        // Nettoie tous les mocks avant chaque test pour garantir l'isolation.
        jest.clearAllMocks();
    });

    describe('sendLicenseAndInvoice', () => {
        const company = { email: 'client@test.com', name: 'Client Corp' };
        const license = { expires_at: new Date(), qr_code_payload: 'QR-123', order_id: 'order-abc' };
        const invoicePdfBuffer = Buffer.from('fake-pdf-content');

        /**
         * @description Teste le cas nominal où l'envoi de l'email réussit.
         */
        it('doit appeler sendMail avec les bons arguments en cas de succès', async () => {
            // Arrange : Configurer le mock pour simuler un envoi réussi.
            mockSendMail.mockResolvedValue(true);

            // Act : Appeler la méthode du service.
            await emailService.sendLicenseAndInvoice(company, license, invoicePdfBuffer);

            // Assert : Vérifier que le transporteur d'email a été appelé correctement.
            expect(mockSendMail).toHaveBeenCalledTimes(1);
            const mailOptions = mockSendMail.mock.calls[0][0];
            expect(mailOptions.to).toBe(company.email);
            expect(mailOptions.subject).toContain(company.name);
            expect(mailOptions.attachments[0].filename).toBe(`facture-geodiag-${license.order_id}.pdf`);
            expect(mailOptions.attachments[0].content).toBe(invoicePdfBuffer);
        });

        /**
         * @description Teste le cas où le transporteur d'email lève une erreur.
         */
        it('doit lever une ApiException si l\'envoi de l\'email échoue', async () => {
            // Arrange : Configurer le mock pour simuler un échec d'envoi.
            const transportError = new Error('SMTP Connection Error');
            mockSendMail.mockRejectedValue(transportError);

            // Act & Assert : Vérifier que la méthode rejette la promesse avec une ApiException.
            // L'utilisation d'une fonction fléchée dans expect est nécessaire pour tester les exceptions dans du code asynchrone.
            await expect(emailService.sendLicenseAndInvoice(company, license, invoicePdfBuffer))
                .rejects.toThrow(ApiException);
            
            // Vérifier que l'échec a bien été tenté.
            expect(mockSendMail).toHaveBeenCalledTimes(1);
        });
    });
});
