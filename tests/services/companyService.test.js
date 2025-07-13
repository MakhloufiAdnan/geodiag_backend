import { jest, describe, it, expect, beforeEach } from '@jest/globals';

/**
 * @file Tests unitaires pour CompanyService
 */

// 1. Mocker le repository
jest.unstable_mockModule('../../src/repositories/companyRepository.js', () => ({
    default: {
        findAll: jest.fn(),
        findById: jest.fn(),
        findByEmail: jest.fn(),
        create: jest.fn(),
    },
}));

// 2. Imports
const { default: companyRepository } = await import('../../src/repositories/companyRepository.js');
const { default: companyService } = await import('../../src/services/companyService.js');

describe('CompanyService', () => {
    
    // 3. Définir des utilisateurs simulés
    const mockAdminUser = { userId: 'admin-uuid', role: 'admin' };
    const mockTechnicianUser = { userId: 'tech-uuid', role: 'technician' };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    // --- Tests pour getAllCompanies ---
    describe('getAllCompanies', () => {
        it('Doit retourner toutes les compagnies si appelé par un admin', async () => {
            // Arrange
            companyRepository.findAll.mockResolvedValue([{ name: 'Test Co' }]);

            // Act
            await companyService.getAllCompanies(mockAdminUser);

            // Assert
            expect(companyRepository.findAll).toHaveBeenCalled();
        });

        it('Doit lever une erreur 403 si appelé par un technicien', async () => {
            // Arrange
            const action = async () => await companyService.getAllCompanies(mockTechnicianUser);

            // Act & Assert
            await expect(action).rejects.toThrow('Accès refusé. Droits administrateur requis.');
        });
    });
});