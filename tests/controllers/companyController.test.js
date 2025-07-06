import { jest, describe, it, expect, beforeEach } from '@jest/globals';

/**
 * @file Tests unitaires pour CompanyController
 * @description Valide que le contrôleur appelle le service avec les bons arguments
 * et renvoie la réponse HTTP appropriée.
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

    it('getAllCompanies doit appeler le service avec req.user et renvoyer 200', async () => {
        // Préparation
        const fakeCompanies = [{ name: 'Test Co' }];
        companyService.getAllCompanies.mockResolvedValue(fakeCompanies);

        // Action
        await companyController.getAllCompanies(mockReq, mockRes, mockNext);

        // Assertion
        expect(companyService.getAllCompanies).toHaveBeenCalledWith(mockReq.user);
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith(fakeCompanies);
    });
    
    it('createCompany doit appeler le service avec req.body et req.user et renvoyer 201', async () => {
        // Préparation
        const newCompanyData = { name: 'New Co', email: 'new@co.com' };
        const createdCompany = { companyId: 'uuid-123', ...newCompanyData };
        mockReq.body = newCompanyData;
        companyService.createCompany.mockResolvedValue(createdCompany);

        // Action
        await companyController.createCompany(mockReq, mockRes, mockNext);

        // Assertion
        expect(companyService.createCompany).toHaveBeenCalledWith(newCompanyData, mockReq.user);
        expect(mockRes.status).toHaveBeenCalledWith(201);
        expect(mockRes.json).toHaveBeenCalled();
    });

    it('doit appeler next(error) si un service lève une erreur', async () => {
        // Préparation
        const fakeError = new Error("Erreur de service");
        companyService.getAllCompanies.mockRejectedValue(fakeError);

        // Action
        await companyController.getAllCompanies(mockReq, mockRes, mockNext);

        // Assertion
        expect(mockNext).toHaveBeenCalledWith(fakeError);
    });
});