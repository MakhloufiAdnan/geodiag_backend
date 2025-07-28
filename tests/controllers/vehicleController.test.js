import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { NotFoundException } from '../../src/exceptions/ApiException.js';
/**
 * @file Tests unitaires pour VehicleController.
 * @description Valide la logique du contrôleur pour la gestion des véhicules.
 */
jest.unstable_mockModule('../../src/services/vehicleService.js', () => ({
  default: {
    getVehicleByRegistration: jest.fn(),
    getAllVehicles: jest.fn(),
    createVehicle: jest.fn(),
  },
}));

const { default: vehicleService } = await import(
  '../../src/services/vehicleService.js'
);
const { default: vehicleController } = await import(
  '../../src/controllers/vehicleController.js'
);

describe('VehicleController', () => {
  let mockReq, mockRes, mockNext;
  beforeEach(() => {
    mockReq = {
      params: {},
      body: {},
      user: { role: 'technician' },
      pagination: { page: 1, limit: 20 },
    };
    mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('getAllVehicles', () => {
    it('doit appeler le service avec la pagination et renvoyer 200', async () => {
      const paginatedResult = { data: [], meta: {} };
      vehicleService.getAllVehicles.mockResolvedValue(paginatedResult);

      await vehicleController.getAllVehicles(mockReq, mockRes, mockNext);

      expect(vehicleService.getAllVehicles).toHaveBeenCalledWith(1, 20);
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getVehicleByRegistration', () => {
    it('doit retourner 200 et le véhicule si trouvé', async () => {
      const registration = 'AA-123-BB';
      const fakeVehicle = { registration };
      mockReq.params.registration = registration;
      vehicleService.getVehicleByRegistration.mockResolvedValue(fakeVehicle);

      await vehicleController.getVehicleByRegistration(
        mockReq,
        mockRes,
        mockNext
      );

      expect(vehicleService.getVehicleByRegistration).toHaveBeenCalledWith(
        registration
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(fakeVehicle);
    });

    it('doit appeler next(error) si le service lève une NotFoundException', async () => {
      const notFoundError = new NotFoundException('Véhicule non trouvé.');
      mockReq.params.registration = 'XX-999-ZZ';
      vehicleService.getVehicleByRegistration.mockRejectedValue(notFoundError);

      await vehicleController.getVehicleByRegistration(
        mockReq,
        mockRes,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(notFoundError);
    });
  });

  describe('createVehicle', () => {
    it('doit retourner 201 et le nouveau véhicule en cas de succès', async () => {
      const vehicleData = { registration: 'NEW-123-CAR' };
      const newVehicle = { vehicleId: 'new-uuid', ...vehicleData };
      mockReq.body = vehicleData;
      vehicleService.createVehicle.mockResolvedValue(newVehicle);

      await vehicleController.createVehicle(mockReq, mockRes, mockNext);

      expect(vehicleService.createVehicle).toHaveBeenCalledWith(vehicleData);
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(newVehicle);
    });
  });
});
