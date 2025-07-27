import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { mockOrder, mockOffer, mockLicense } from '../../mocks/mockData.js';

/**
 * @file Tests unitaires pour LicenseService.
 */
jest.unstable_mockModule('../../src/repositories/licenseRepository.js', () => ({
  default: { create: jest.fn() },
}));

const { default: licenseRepository } = await import(
  '../../src/repositories/licenseRepository.js'
);
const { default: licenseService } = await import(
  '../../src/services/licenseService.js'
);

describe('LicenseService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createLicenseForOrder', () => {
    it("doit calculer la date d'expiration et générer un QR code", async () => {
      // Arrange
      licenseRepository.create.mockResolvedValue(mockLicense);
      const expectedExpiration = new Date();
      expectedExpiration.setMonth(
        expectedExpiration.getMonth() + mockOffer.duration_months
      );

      // Act
      await licenseService.createLicenseForOrder(mockOrder, mockOffer);

      // Assert
      expect(licenseRepository.create).toHaveBeenCalledTimes(1);
      const createCallArg = licenseRepository.create.mock.calls[0][0];

      expect(createCallArg.order_id).toBe(mockOrder.order_id);
      expect(createCallArg.status).toBe('active');
      expect(createCallArg.expires_at.getTime()).toBeCloseTo(
        expectedExpiration.getTime(),
        -4
      );

      const expectedPattern = new RegExp(`^LIC-${mockOrder.company_id}-`);
      expect(createCallArg.qr_code_payload).toMatch(expectedPattern);
    });
  });
});
