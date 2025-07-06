import { jest, describe, it, expect, beforeEach } from '@jest/globals';

/**
 * @file Tests unitaires pour CompanyController
 */

// 1. Mocker le service
jest.unstable_mockModule('../../src/services/companyService.js', () => ({
    default: {
        getAllCompanies: jest.fn(),
        getCompanyById: jest.fn(),
        createCompany: jest.fn(),
    },
}));

// 2. Imports
const { default: companyService } = await import('../../src/services/companyService.js');
const { default: companyController } = await import('../../src/controllers/companyController.js');

describe('CompanyController', () => {
    let mockReq, mockRes, mockNext;

    beforeEach(() => {
        mockReq = {
            params: {},
            body: {},
            user: { userId: 'admin-uuid', role: 'admin' }, // Simuler un admin connecté
        };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        mockNext = jest.fn();
        jest.clearAllMocks();
    });

    it('getAllCompanies doit appeler le service et renvoyer 200', async () => {
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
    
    it('createCompany doit appeler le service et renvoyer 201', async () => {
        // Arrange
        const newCompanyData = { name: 'New Co', email: 'new@co.com' };
        const createdCompany = { companyId: 'uuid-123', ...newCompanyData };
        mockReq.body = newCompanyData;
        companyService.createCompany.mockResolvedValue(createdCompany);

        // Act
        await companyController.createCompany(mockReq, mockRes, mockNext);

        // Assert
        expect(companyService.createCompany).toHaveBeenCalledWith(newCompanyData, mockReq.user);
        expect(mockRes.status).toHaveBeenCalledWith(201);
        expect(mockRes.json).toHaveBeenCalled();
    });

    it('doit appeler next(error) si un service lève une erreur', async () => {
        // Arrange
        const fakeError = new Error("Erreur de service");
        companyService.getAllCompanies.mockRejectedValue(fakeError);

        // Act
        await companyController.getAllCompanies(mockReq, mockRes, mockNext);

        // Assert
        expect(mockNext).toHaveBeenCalledWith(fakeError);
    });
});