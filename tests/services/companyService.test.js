import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { NotFoundException } from '../../src/exceptions/apiException.js';

/**
 * @file Tests unitaires pour CompanyService.
 * @description Valide la logique métier du service des compagnies. Les tests d'autorisation
 * sont délégués aux tests d'intégration car gérés par les middlewares.
 */

jest.unstable_mockModule('../../src/repositories/companyRepository.js', () => ({
    default: {
        findAll: jest.fn(),
        findById: jest.fn(),
        countAll: jest.fn(),
    },
}));

const { default: companyRepository } = await import('../../src/repositories/companyRepository.js');
const { default: companyService } = await import('../../src/services/companyService.js');

describe('CompanyService', () => {
    beforeEach(() => { jest.clearAllMocks(); });

    /**
     * @describe Suite de tests pour la méthode getAllCompanies.
     */
    describe('getAllCompanies', () => {
        /**
         * @it Doit retourner une liste paginée de DTOs.
         */
        it('doit retourner une liste paginée de DTOs', async () => {
            // Arrange
            const fakeCompanies = [{ company_id: '1', name: 'Test Co' }];
            companyRepository.findAll.mockResolvedValue(fakeCompanies);
            companyRepository.countAll.mockResolvedValue(1);
            
            // Act
            const result = await companyService.getAllCompanies(1, 10);

            // Assert
            expect(companyRepository.findAll).toHaveBeenCalledWith(10, 0);
            expect(companyRepository.countAll).toHaveBeenCalled();
            expect(result.data[0]).toHaveProperty('companyId', '1');
            expect(result.meta.totalItems).toBe(1);
        });
    });

    /**
     * @describe Suite de tests pour la méthode getCompanyById.
     */
    describe('getCompanyById', () => {
        /**
         * @it Doit retourner un DTO si la compagnie est trouvée.
         */
        it('doit retourner un DTO si la compagnie est trouvée', async () => {
            // Arrange
            const companyId = 'co-uuid-123';
            const fakeCompany = { company_id: companyId, name: 'Test Co' };
            companyRepository.findById.mockResolvedValue(fakeCompany);
            
            // Act
            const result = await companyService.getCompanyById(companyId);

            // Assert
            expect(companyRepository.findById).toHaveBeenCalledWith(companyId);
            expect(result).toHaveProperty('companyId', companyId);
        });

        /**
         * @it Doit lever une NotFoundException si la compagnie n'est pas trouvée.
         */
        it("doit lever une NotFoundException si la compagnie n'existe pas", async () => {
            // Arrange
            companyRepository.findById.mockResolvedValue(null);
            const action = () => companyService.getCompanyById('non-existent-id');
            
            // Act & Assert
            await expect(action).rejects.toThrow(NotFoundException);
        });
    });
});