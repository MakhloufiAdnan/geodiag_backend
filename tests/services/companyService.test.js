import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { mockCompany } from '../../mocks/mockData.js';
import { NotFoundException } from '../../src/exceptions/ApiException.js';

/**
 * @file Tests unitaires pour CompanyService.
 * @description Ce fichier valide la logique métier liée aux compagnies, en simulant
 * les dépendances externes (CompanyRepository) pour isoler et tester le service.
 */

// Mocker toutes les dépendances pour isoler le service
const mockCompanyRepositoryFindAll = jest.fn();
const mockCompanyRepositoryFindById = jest.fn();
const mockCompanyRepositoryCountAll = jest.fn();

jest.unstable_mockModule('../../src/repositories/companyRepository.js', () => ({
  default: {
    findAll: mockCompanyRepositoryFindAll,
    findById: mockCompanyRepositoryFindById,
    countAll: mockCompanyRepositoryCountAll,
  },
}));

// Mock pour l'utilitaire de pagination
jest.unstable_mockModule('../../src/utils/paginationUtils.js', () => ({
  createPaginatedResponse: jest.fn((options) => ({
    data: options.data,
    metadata: {
      totalItems: options.totalItems,
      currentPage: options.page,
      itemsPerPage: options.limit,
      totalPages: Math.ceil(options.totalItems / options.limit),
    },
  })),
}));

// Import du service après la configuration de tous les mocks
const { default: companyService } = await import(
  '../../src/services/companyService.js'
);

/**
 * Suite de tests pour le service de compagnie (CompanyService).
 * @module CompanyServiceTests
 */
describe('CompanyService', () => {
  /**
   * Exécuté avant chaque test.
   * Réinitialise tous les mocks Jest.
   */
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Suite de tests pour la méthode `getAllCompanies`.
   * @memberof CompanyServiceTests
   */
  describe('getAllCompanies', () => {
    /**
     * Teste la récupération réussie d'une liste paginée de DTOs de compagnies.
     * @test
     */
    it('doit retourner une liste paginée de DTOs', async () => {
      // Arrange
      const fakeCompanies = [mockCompany];
      const totalItems = 1;
      const page = 1;
      const limit = 10;

      mockCompanyRepositoryFindAll.mockResolvedValue(fakeCompanies);
      mockCompanyRepositoryCountAll.mockResolvedValue(totalItems);

      // Act
      const result = await companyService.getAllCompanies(page, limit);

      // Assert
      expect(mockCompanyRepositoryFindAll).toHaveBeenCalledWith(
        limit,
        (page - 1) * limit
      );
      expect(mockCompanyRepositoryCountAll).toHaveBeenCalledTimes(1);
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toHaveProperty(
        'companyId',
        mockCompany.company_id
      );
      expect(result.metadata.totalItems).toBe(totalItems);
      expect(result.metadata.currentPage).toBe(page);
      expect(result.metadata.itemsPerPage).toBe(limit);
      expect(result.metadata.totalPages).toBe(Math.ceil(totalItems / limit));
    });

    /**
     * Teste la récupération d'une liste vide si aucune compagnie n'est trouvée.
     * @test
     */
    it("doit retourner une liste vide si aucune compagnie n'est trouvée", async () => {
      // Arrange
      const fakeCompanies = [];
      const totalItems = 0;
      const page = 1;
      const limit = 10;

      mockCompanyRepositoryFindAll.mockResolvedValue(fakeCompanies);
      mockCompanyRepositoryCountAll.mockResolvedValue(totalItems);

      // Act
      const result = await companyService.getAllCompanies(page, limit);

      // Assert
      expect(mockCompanyRepositoryFindAll).toHaveBeenCalledWith(
        limit,
        (page - 1) * limit
      );
      expect(mockCompanyRepositoryCountAll).toHaveBeenCalledTimes(1);
      expect(result.data).toHaveLength(0);
      expect(result.metadata.totalItems).toBe(totalItems);
    });
  });

  /**
   * Suite de tests pour la méthode `getCompanyById`.
   * @memberof CompanyServiceTests
   */
  describe('getCompanyById', () => {
    /**
     * Teste la récupération réussie d'un DTO de compagnie par ID.
     * @test
     */
    it('doit retourner un DTO si la compagnie est trouvée', async () => {
      // Arrange
      mockCompanyRepositoryFindById.mockResolvedValue(mockCompany);

      // Act
      const result = await companyService.getCompanyById(
        mockCompany.company_id
      );

      // Assert
      expect(mockCompanyRepositoryFindById).toHaveBeenCalledWith(
        mockCompany.company_id
      );
      expect(result).toHaveProperty('companyId', mockCompany.company_id);
      expect(result.name).toBe(mockCompany.name);
    });

    /**
     * Teste la levée d'une `NotFoundException` si la compagnie n'est pas trouvée par ID.
     * @test
     */
    it("doit lever une NotFoundException si la compagnie n'est pas trouvée", async () => {
      // Arrange
      mockCompanyRepositoryFindById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        companyService.getCompanyById('non-existent-id')
      ).rejects.toThrow(NotFoundException);
      expect(mockCompanyRepositoryFindById).toHaveBeenCalledWith(
        'non-existent-id'
      );
    });
  });
});
