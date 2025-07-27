import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { mockCompany, mockLicense } from '../../mocks/mockData.js';

/**
 * @file Tests unitaires pour EmailService.
 */

const mockSendMail = jest.fn();
jest.unstable_mockModule('nodemailer', () => ({
  default: {
    createTransport: () => ({
      sendMail: mockSendMail,
    }),
  },
}));

const { default: emailService } = await import(
  '../../src/services/emailService.js'
);

describe('EmailService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sendLicenseAndInvoice', () => {
    const invoicePdfBuffer = Buffer.from('fake-pdf-content');

    it('doit appeler sendMail avec les bons arguments en cas de succès', async () => {
      // Arrange
      mockSendMail.mockResolvedValue(true);

      // Act
      await emailService.sendLicenseAndInvoice(
        mockCompany,
        mockLicense,
        invoicePdfBuffer
      );

      // Assert
      const mailOptions = mockSendMail.mock.calls[0][0];
      expect(mailOptions.to).toBe(mockCompany.email);
      expect(mailOptions.subject).toContain(mockCompany.name);
    });
  });
});
