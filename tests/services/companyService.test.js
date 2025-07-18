import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { ForbiddenException, NotFoundException } from '../../src/exceptions/apiException.js';

/**
 * @file Tests unitaires pour CompanyService.
 * @description Valide la logique métier et les règles d'autorisation du service des compagnies.
 */

// Mocker le repository pour isoler le service
jest.unstable_mockModule('../../src/repositories/companyRepository.js', () => ({
    default: {
        findAll: jest.fn(),
        findById: jest.fn(),
    },
}));

const { default: companyRepository } = await import('../../src/repositories/companyRepository.js');
const { default: companyService } = await import('../../src/services/companyService.js');

describe('CompanyService', () => {
    const mockAdminUser = { userId: 'admin-uuid', role: 'admin' };
    const mockTechnicianUser = { userId: 'tech-uuid', role: 'technician' };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    /**
     * @describe Suite de tests pour la méthode getAllCompanies.
     */
    describe('getAllCompanies', () => {
        /**
         * @it Doit retourner une liste de DTOs si l'appelant est un administrateur.
         */
        it('doit retourner une liste de DTOs si appelé par un admin', async () => {

        // Arrange
        const fakeCompanies = [{ company_id: '1', name: 'Test Co' }];
        companyRepository.findAll.mockResolvedValue(fakeCompanies);
        
        // Act
        const result = await companyService.getAllCompanies(mockAdminUser);

        // Assert
        expect(companyRepository.findAll).toHaveBeenCalled();
        expect(result[0]).toHaveProperty('companyId', '1');
        });

        /**
         * @it Doit lever une ForbiddenException si l'appelant n'est pas un administrateur.
         */
        it('doit lever une ForbiddenException si appelé par un non-admin', async () => {

        // Arrange
        const action = () => companyService.getAllCompanies(mockTechnicianUser);
        
        // Act & Assert
        await expect(action).rejects.toThrow(ForbiddenException);
        });
    });

    /**
     * @describe Suite de tests pour la méthode getCompanyById.
     */
    describe('getCompanyById', () => {
        const companyId = 'co-uuid-123';
        
        /**
         * @it Doit retourner un DTO si l'appelant est un admin et que la compagnie est trouvée.
         */
        it('doit retourner un DTO si appelé par un admin et que la compagnie existe', async () => {

        // Arrange
        const fakeCompany = { company_id: companyId, name: 'Test Co' };
        companyRepository.findById.mockResolvedValue(fakeCompany);
        
        // Act
        const result = await companyService.getCompanyById(companyId, mockAdminUser);

        // Assert
        expect(companyRepository.findById).toHaveBeenCalledWith(companyId);
        expect(result).toHaveProperty('companyId', companyId);
        });

        /**
         * @it Doit lever une NotFoundException si la compagnie n'est pas trouvée.
         */
        it('doit lever une NotFoundException si la compagnie n\'existe pas', async () => {
            
        // Arrange
        companyRepository.findById.mockResolvedValue(null);
        const action = () => companyService.getCompanyById(companyId, mockAdminUser);
        
        // Act & Assert
        await expect(action).rejects.toThrow(NotFoundException);
        });
    });
});