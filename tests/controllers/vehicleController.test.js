import { jest, describe, it, expect, beforeEach } from '@jest/globals';

/**
 * @file Tests unitaires pour VehicleController.
 * @description Valide la logique du contrôleur pour la gestion des véhicules.
 */

jest.unstable_mockModule('../../src/services/vehicleService.js', () => ({
    default: {
        getVehicleByRegistration: jest.fn(),
        createVehicle: jest.fn(),
    },
}));

const { default: vehicleService } = await import('../../src/services/vehicleService.js');
const { default: vehicleController } = await import('../../src/controllers/vehicleController.js');

describe('VehicleController', () => {
    let mockReq, mockRes, mockNext;

    beforeEach(() => {
        mockReq = {
        params: {},
        body: {},
        user: { role: 'technician' },
        };
        mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        };
        mockNext = jest.fn();
        jest.clearAllMocks();
    });

    describe('getVehicleByRegistration', () => {
        it('doit retourner 200 et le véhicule si trouvé', async () => {

        // Arrange
        const registration = 'AA-123-BB';
        const fakeVehicle = { registration };
        mockReq.params.registration = registration;
        vehicleService.getVehicleByRegistration.mockResolvedValue(fakeVehicle);

        // Act
        await vehicleController.getVehicleByRegistration(mockReq, mockRes, mockNext);

        // Assert
        expect(vehicleService.getVehicleByRegistration).toHaveBeenCalledWith(registration, mockReq.user);
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith(fakeVehicle);
        });

        it('doit retourner 404 si le véhicule n\'est pas trouvé', async () => {

        // Arrange
        const registration = 'XX-999-ZZ';
        mockReq.params.registration = registration;
        vehicleService.getVehicleByRegistration.mockResolvedValue(null);

        // Act
        await vehicleController.getVehicleByRegistration(mockReq, mockRes, mockNext);

        // Assert
        expect(mockRes.status).toHaveBeenCalledWith(404);
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'Vehicle not found' });
        });
    });

    describe('createVehicle', () => {
        it('doit retourner 201 et le nouveau véhicule en cas de succès', async () => {
            
        // Arrange
        const vehicleData = { registration: 'NEW-123-CAR' };
        const newVehicle = { vehicleId: 'new-uuid', ...vehicleData };
        mockReq.body = vehicleData;
        vehicleService.createVehicle.mockResolvedValue(newVehicle);

        // Act
        await vehicleController.createVehicle(mockReq, mockRes, mockNext);

        // Assert
        expect(vehicleService.createVehicle).toHaveBeenCalledWith(vehicleData, mockReq.user);
        expect(mockRes.status).toHaveBeenCalledWith(201);
        expect(mockRes.json).toHaveBeenCalledWith(newVehicle);
        });
    });
});