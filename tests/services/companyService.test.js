import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { mockCompany } from '../../mocks/mockData.js';

/**
 * @file Tests unitaires pour CompanyService.
 */

jest.unstable_mockModule('../../src/repositories/companyRepository.js', () => ({
  default: {
    findAll: jest.fn(),
    findById: jest.fn(),
    countAll: jest.fn(),
  },
}));

const { default: companyRepository } = await import(
  '../../src/repositories/companyRepository.js'
);
const { default: companyService } = await import(
  '../../src/services/companyService.js'
);

describe('CompanyService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllCompanies', () => {
    it('doit retourner une liste paginée de DTOs', async () => {
      // Arrange
      const fakeCompanies = [mockCompany];
      companyRepository.findAll.mockResolvedValue(fakeCompanies);
      companyRepository.countAll.mockResolvedValue(1);

      // Act
      const result = await companyService.getAllCompanies(1, 10);

      // Assert
      expect(result.data[0]).toHaveProperty(
        'companyId',
        mockCompany.company_id
      );
      expect(result.metadata.totalItems).toBe(1);
    });
  });

  describe('getCompanyById', () => {
    it('doit retourner un DTO si la compagnie est trouvée', async () => {
      // Arrange
      companyRepository.findById.mockResolvedValue(mockCompany);

      // Act
      const result = await companyService.getCompanyById(
        mockCompany.company_id
      );

      // Assert
      expect(result).toHaveProperty('companyId', mockCompany.company_id);
    });
  });
});
