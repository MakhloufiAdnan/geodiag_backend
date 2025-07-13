import { jest, describe, it, expect, beforeEach } from '@jest/globals';

/**
 * @file Tests unitaires pour CompanyController.
 * @description Valide que le contrôleur appelle le service avec les bons arguments
 * et renvoie la réponse HTTP appropriée, en isolant la couche de service.
 */

jest.unstable_mockModule('../../src/services/companyService.js', () => ({
    default: {
        getAllCompanies: jest.fn(),
        getCompanyById: jest.fn(),
    },
}));

const { default: companyService } = await import('../../src/services/companyService.js');
const { default: companyController } = await import('../../src/controllers/companyController.js');
const { CompanyDto } = await import('../../src/dtos/companyDto.js');

describe('CompanyController', () => {
    let mockReq, mockRes, mockNext;

    beforeEach(() => {
        mockReq = { params: {}, user: { userId: 'admin-uuid', role: 'admin' } };
        mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        mockNext = jest.fn();
        jest.clearAllMocks();
    });

    describe('getAllCompanies', () => {
        it('doit appeler le service avec req.user et renvoyer 200', async () => {
            // Arrange
            const fakeCompanies = [{ name: 'Test Co' }];
            companyService.getAllCompanies.mockResolvedValue(fakeCompanies);

            // Act
            await companyController.getAllCompanies(mockReq, mockRes, mockNext);

            // Assert
            expect(companyService.getAllCompanies).toHaveBeenCalledWith(mockReq.user);
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith(fakeCompanies);
        });
    });
    
    describe('getCompanyById', () => {
        it('doit retourner un DTO et un statut 200 si la compagnie est trouvée', async () => {
            // Arrange
            const companyId = 'uuid-123';
            const fakeCompany = { company_id: companyId, name: 'Test Co' };
            mockReq.params.id = companyId;
            companyService.getCompanyById.mockResolvedValue(new CompanyDto(fakeCompany));

            // Act
            await companyController.getCompanyById(mockReq, mockRes, mockNext);

            // Assert
            expect(companyService.getCompanyById).toHaveBeenCalledWith(companyId, mockReq.user);
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith(new CompanyDto(fakeCompany));
        });

        it('doit retourner un statut 404 si la compagnie n\'est pas trouvée', async () => {
            // Arrange
            mockReq.params.id = 'uuid-inconnu';
            companyService.getCompanyById.mockResolvedValue(null);

            // Act
            await companyController.getCompanyById(mockReq, mockRes, mockNext);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith({ message: "Company not found" });
        });
    });
});