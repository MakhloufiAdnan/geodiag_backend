import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { mockCompany, mockLicense } from '../../mocks/mockData.js';
import { ApiException } from '../../src/exceptions/ApiException.js';

/**
 * @file Tests unitaires pour EmailService.
 * @description Ce fichier valide la logique métier liée à l'envoi d'emails, en simulant
 * les dépendances externes (Nodemailer, logger) pour isoler et tester le service.
 */

// Mock pour nodemailer
const mockSendMail = jest.fn();
jest.unstable_mockModule('nodemailer', () => ({
  default: {
    createTransport: () => ({
      sendMail: mockSendMail,
    }),
  },
}));

// Mock pour le logger
const mockLoggerInfo = jest.fn();
const mockLoggerError = jest.fn();
jest.unstable_mockModule('../../src/config/logger.js', () => ({
  default: {
    info: mockLoggerInfo,
    error: mockLoggerError,
  },
}));

// Import dynamique du service d'email après la configuration des mocks
const { default: emailService } = await import(
  '../../src/services/emailService.js'
);

/**
 * Suite de tests pour le service d'email (EmailService).
 * @module EmailServiceTests
 */
describe('EmailService', () => {
  /**
   * Exécuté avant chaque test.
   * Réinitialise les mocks.
   */
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Suite de tests pour la méthode `sendLicenseAndInvoice`.
   * @memberof EmailServiceTests
   */
  describe('sendLicenseAndInvoice', () => {
    /**
     * Buffer mocké pour le contenu PDF de la facture.
     * @type {Buffer}
     */
    const invoicePdfBuffer = Buffer.from('fake-pdf-content');

    /**
     * Teste que `sendMail` est appelé avec les bons arguments en cas de succès.
     * @test
     */
    it('doit appeler sendMail avec les bons arguments en cas de succès', async () => {
      // Arrange
      mockSendMail.mockResolvedValue(true); // Simule un envoi d'email réussi

      // Act
      await emailService.sendLicenseAndInvoice(
        mockCompany,
        mockLicense,
        invoicePdfBuffer
      );

      // Assert
      expect(mockSendMail).toHaveBeenCalledTimes(1);
      const mailOptions = mockSendMail.mock.calls[0][0];
      expect(mailOptions.from).toBe(`Geodiag <${process.env.EMAIL_FROM}>`);
      expect(mailOptions.to).toBe(mockCompany.email);
      // Correction ici : le sujet réel utilise "pour" et la phrase complète
      expect(mailOptions.subject).toContain(
        `Votre licence Geodiag pour ${mockCompany.name} est activée !`
      );
      expect(mailOptions.html).toContain(`Bonjour ${mockCompany.name},`);
      expect(mailOptions.html).toContain(
        `Votre licence est désormais active et sera valide jusqu'au <strong>${new Date(mockLicense.expires_at).toLocaleDateString('fr-FR')}</strong>.`
      );
      expect(mailOptions.html).toContain(
        `Votre QR code d'activation est : <strong>${mockLicense.qr_code_payload}</strong>`
      );
      expect(mailOptions.attachments).toHaveLength(1);
      expect(mailOptions.attachments[0].filename).toBe(
        `facture-geodiag-${mockLicense.order_id}.pdf`
      );
      expect(mailOptions.attachments[0].content).toEqual(invoicePdfBuffer);
      expect(mailOptions.attachments[0].contentType).toBe('application/pdf');
      expect(mockLoggerInfo).toHaveBeenCalledWith(
        { to: mockCompany.email, orderId: mockLicense.order_id },
        '✅ Email de confirmation envoyé avec succès.'
      );
      expect(mockLoggerError).not.toHaveBeenCalled(); // S'assurer que l'erreur n'est pas loggée
    });

    /**
     * Teste la levée d'une `ApiException` et la journalisation d'une erreur
     * si l'envoi de l'email échoue.
     * @test
     */
    it("doit lever une ApiException et logger l'erreur si l'envoi de l'email échoue", async () => {
      // Arrange
      const mailError = new Error('SMTP connection failed');
      mockSendMail.mockRejectedValue(mailError); // Simule un échec d'envoi d'email

      // Act & Assert
      await expect(
        emailService.sendLicenseAndInvoice(
          mockCompany,
          mockLicense,
          invoicePdfBuffer
        )
      ).rejects.toThrow(ApiException);

      expect(mockSendMail).toHaveBeenCalledTimes(1);
      expect(mockLoggerError).toHaveBeenCalledWith(
        { err: mailError, recipient: mockCompany.email },
        `❌ Erreur critique lors de l'envoi de l'email.`
      );
      expect(mockLoggerInfo).not.toHaveBeenCalled(); // S'assurer que le succès n'est pas loggé
    });
  });
});
