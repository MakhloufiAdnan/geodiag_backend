import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import {
  NotFoundException,
  ConflictException,
} from '../../src/exceptions/ApiException.js';
import { CompanyDto } from '../../src/dtos/companyDto.js';

/**
 * @file Tests unitaires pour CompanyController.
 * @description Valide que le contrôleur appelle le service avec les bons arguments
 * et renvoie la réponse HTTP appropriée, en isolant la couche de service.
 */
jest.unstable_mockModule('../../src/services/companyService.js', () => ({
  default: {
    getAllCompanies: jest.fn(),
    getCompanyById: jest.fn(),
    createCompany: jest.fn(),
  },
}));

const { default: companyService } = await import(
  '../../src/services/companyService.js'
);
const { default: companyController } = await import(
  '../../src/controllers/companyController.js'
);

describe('CompanyController', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockReq = {
      params: {},
      body: {},
      user: { userId: 'admin-uuid', role: 'admin' },
      log: { info: jest.fn() },
      pagination: { page: 1, limit: 10 },
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('getAllCompanies', () => {
    it('doit appeler le service avec la pagination et renvoyer 200 avec les résultats', async () => {
      // Arrange
      const paginatedResult = { data: [], meta: {} };
      companyService.getAllCompanies.mockResolvedValue(paginatedResult);

      // Act
      await companyController.getAllCompanies(mockReq, mockRes, mockNext);

      // Assert
      expect(companyService.getAllCompanies).toHaveBeenCalledWith(1, 10);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(paginatedResult);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('doit appeler next(error) si le service lève une erreur', async () => {
      // Arrange
      const serviceError = new Error('Erreur de base de données');
      companyService.getAllCompanies.mockRejectedValue(serviceError);

      // Act
      await companyController.getAllCompanies(mockReq, mockRes, mockNext);

      // Assert
      expect(companyService.getAllCompanies).toHaveBeenCalledWith(1, 10);
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(serviceError);
    });
  });

  describe('getCompanyById', () => {
    it('doit retourner 200 et la compagnie si elle est trouvée', async () => {
      // Arrange
      const fakeCompany = { name: 'Test Co' };
      mockReq.params.id = 'uuid-123';
      companyService.getCompanyById.mockResolvedValue(fakeCompany);

      // Act
      await companyController.getCompanyById(mockReq, mockRes, mockNext);

      // Assert
      expect(companyService.getCompanyById).toHaveBeenCalledWith('uuid-123');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(fakeCompany);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('doit appeler next(error) si le service lève une NotFoundException', async () => {
      // Arrange
      const notFoundError = new NotFoundException('Compagnie non trouvée.');
      mockReq.params.id = 'uuid-inconnu';
      companyService.getCompanyById.mockRejectedValue(notFoundError);

      // Act
      await companyController.getCompanyById(mockReq, mockRes, mockNext);

      // Assert
      expect(companyService.getCompanyById).toHaveBeenCalledWith(
        'uuid-inconnu'
      );
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(notFoundError);
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
      expect(companyService.createCompany).toHaveBeenCalledWith(
        companyData,
        mockReq.user
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(new CompanyDto(createdCompany));
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('doit appeler next(error) si le service lève une ConflictException', async () => {
      // Arrange
      const companyData = {
        name: 'Existing Company',
        email: 'existing@co.com',
      };
      const conflictError = new ConflictException(
        'Cette compagnie existe déjà.'
      );
      mockReq.body = companyData;
      companyService.createCompany.mockRejectedValue(conflictError);

      // Act
      await companyController.createCompany(mockReq, mockRes, mockNext);

      // Assert
      expect(companyService.createCompany).toHaveBeenCalledWith(
        companyData,
        mockReq.user
      );
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(conflictError);
    });
  });
});
