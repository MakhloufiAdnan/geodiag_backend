import { jest, describe, it, expect, beforeEach } from '@jest/globals';

/**
 * @file Tests unitaires pour CompanyController.
 * @description Valide que le contrôleur appelle le service avec les bons arguments
 * et renvoie la réponse HTTP appropriée, en isolant la couche de service.
 */

// 1. Mocker le service pour isoler le contrôleur
jest.unstable_mockModule('../../src/services/companyService.js', () => ({
    default: {
        getAllCompanies: jest.fn(),
        getCompanyById: jest.fn(),
        createCompany: jest.fn(),
    },
}));

// 2. Importer les modules nécessaires après le mock
const { default: companyService } = await import('../../src/services/companyService.js');
const { default: companyController } = await import('../../src/controllers/companyController.js');
const { CompanyDto } = await import('../../src/dtos/companyDto.js');

describe('CompanyController', () => {
    let mockReq, mockRes, mockNext;

    // 3. Réinitialiser les mocks avant chaque test
    beforeEach(() => {
        mockReq = {
        params: {},
        body: {},
        user: { userId: 'admin-uuid', role: 'admin' },
        };
        mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        };
        mockNext = jest.fn();
        jest.clearAllMocks();
    });

    describe('getAllCompanies', () => {
        it('doit appeler le service avec req.user et renvoyer 200 avec les données', async () => {

        // Arrange
        const fakeCompanies = [{ name: 'Test Co 1' }, { name: 'Test Co 2' }];
        companyService.getAllCompanies.mockResolvedValue(fakeCompanies);

        // Act
        await companyController.getAllCompanies(mockReq, mockRes, mockNext);

        // Assert
        expect(companyService.getAllCompanies).toHaveBeenCalledWith(mockReq.user);
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith(fakeCompanies);
        expect(mockNext).not.toHaveBeenCalled();
        });

        it('doit appeler next(error) si le service lève une erreur', async () => {
        // Arrange
        const fakeError = new Error('Erreur de base de données');
        companyService.getAllCompanies.mockRejectedValue(fakeError);

        // Act
        await companyController.getAllCompanies(mockReq, mockRes, mockNext);

        // Assert
        expect(mockNext).toHaveBeenCalledWith(fakeError);
        });
    });

    describe('getCompanyById', () => {
        it('doit retourner un statut 200 et les données de la compagnie si elle est trouvée', async () => {

        // Arrange
        const companyId = 'uuid-123';
        const fakeCompany = { company_id: companyId, name: 'Test Co' };
        mockReq.params.id = companyId;
        companyService.getCompanyById.mockResolvedValue(fakeCompany);

        // Act
        await companyController.getCompanyById(mockReq, mockRes, mockNext);

        // Assert
        expect(companyService.getCompanyById).toHaveBeenCalledWith(companyId, mockReq.user);
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith(fakeCompany);
        });

        it('doit retourner un statut 404 si la compagnie n\'est pas trouvée', async () => {

        // Arrange
        const companyId = 'uuid-inconnu';
        mockReq.params.id = companyId;
        companyService.getCompanyById.mockResolvedValue(null);

        // Act
        await companyController.getCompanyById(mockReq, mockRes, mockNext);

        // Assert
        expect(mockRes.status).toHaveBeenCalledWith(404);
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'Company not found' });
        expect(mockNext).not.toHaveBeenCalled();
        });
    });

    describe('createCompany', () => {
        it('doit retourner 201 et la nouvelle compagnie formatée par le DTO', async () => {
            
            // Arrange
            const companyData = { name: 'New Company', email: 'new@co.com' };
            const createdCompany = { company_id: 'new-uuid', ...companyData };
            mockReq.body = companyData;
            companyService.createCompany.mockResolvedValue(createdCompany);

            // Act
            await companyController.createCompany(mockReq, mockRes, mockNext);

            // Assert
            expect(companyService.createCompany).toHaveBeenCalledWith(companyData, mockReq.user);
            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith(new CompanyDto(createdCompany));
        });
    });
});