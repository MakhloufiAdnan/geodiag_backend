import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { ConflictException, NotFoundException } from '../../src/exceptions/apiException.js';
import { VehicleDto } from '../../src/dtos/vehicleDto.js';

/**
 * @file Tests unitaires pour VehicleService.
 * @description Valide la logique métier pour la gestion des véhicules, y compris la récupération,
 * la création, et la gestion des conflits (immatriculation, VIN).
 */

// Mocker le repository pour isoler le service de la base de données.
jest.unstable_mockModule('../../src/repositories/vehicleRepository.js', () => ({
    default: {
        findByRegistration: jest.fn(),
        findByVin: jest.fn(),
        create: jest.fn(),
        findAll: jest.fn(),
        countAll: jest.fn(),
    },
}));

const { default: vehicleRepository } = await import('../../src/repositories/vehicleRepository.js');
const { default: vehicleService } = await import('../../src/services/vehicleService.js');

describe('VehicleService', () => {
    const mockVehicle = {
        vehicle_id: 'vehicle-uuid-123',
        registration: 'AA-123-BB',
        vin: '1234567890ABCDEFG',
        brand: 'TestBrand',
        model: 'TestModel',
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getVehicleByRegistration', () => {
        it('doit retourner un VehicleDto si le véhicule est trouvé', async () => {
            // Arrange
            vehicleRepository.findByRegistration.mockResolvedValue(mockVehicle);

            // Act
            const result = await vehicleService.getVehicleByRegistration('AA-123-BB');

            // Assert
            expect(vehicleRepository.findByRegistration).toHaveBeenCalledWith('AA-123-BB');
            expect(result).toBeInstanceOf(VehicleDto);
            expect(result.vehicleId).toBe(mockVehicle.vehicle_id);
        });

        it('doit lever une NotFoundException si le véhicule n\'est pas trouvé', async () => {
            // Arrange
            vehicleRepository.findByRegistration.mockResolvedValue(null);

            // Act & Assert
            await expect(vehicleService.getVehicleByRegistration('XX-999-ZZ'))
                .rejects.toThrow(NotFoundException);
        });
    });

    describe('getAllVehicles', () => {
        it('doit retourner une liste paginée de véhicules', async () => {
            // Arrange
            const vehicles = [mockVehicle, { ...mockVehicle, vehicle_id: 'vehicle-uuid-456' }];
            const totalItems = 2;
            vehicleRepository.findAll.mockResolvedValue(vehicles);
            vehicleRepository.countAll.mockResolvedValue(totalItems);

            // Act
            const result = await vehicleService.getAllVehicles(1, 10);

            // Assert
            expect(vehicleRepository.findAll).toHaveBeenCalledWith(10, 0);
            expect(vehicleRepository.countAll).toHaveBeenCalled();
            expect(result.data.length).toBe(2);
            expect(result.data[0]).toBeInstanceOf(VehicleDto);
            expect(result.meta).toEqual({
                totalItems,
                totalPages: 1,
                currentPage: 1,
                pageSize: 10,
            });
        });
    });

    describe('createVehicle', () => {
        const vehicleData = { registration: 'AA-123-BB', vin: '1234567890ABCDEFG' };

        it('doit créer un véhicule avec succès si l\'immatriculation et le VIN sont uniques', async () => {
            // Arrange
            vehicleRepository.findByRegistration.mockResolvedValue(null);
            vehicleRepository.findByVin.mockResolvedValue(null);
            vehicleRepository.create.mockResolvedValue({ vehicle_id: 'new-uuid', ...vehicleData });
            
            // Act
            const result = await vehicleService.createVehicle(vehicleData);
            
            // Assert
            expect(vehicleRepository.create).toHaveBeenCalledWith(vehicleData);
            expect(result).toBeInstanceOf(VehicleDto);
            expect(result.vehicleId).toBe('new-uuid');
        });

        it('doit lever une ConflictException si l\'immatriculation existe déjà', async () => {
            // Arrange
            vehicleRepository.findByRegistration.mockResolvedValue(mockVehicle);
            
            // Act & Assert
            await expect(vehicleService.createVehicle(vehicleData)).rejects.toThrow(ConflictException);
            expect(vehicleRepository.findByVin).not.toHaveBeenCalled(); // La vérification doit s'arrêter
        });

        it('doit lever une ConflictException si le VIN existe déjà', async () => {
            // Arrange
            vehicleRepository.findByRegistration.mockResolvedValue(null);
            vehicleRepository.findByVin.mockResolvedValue(mockVehicle);
            
            // Act & Assert
            await expect(vehicleService.createVehicle(vehicleData)).rejects.toThrow(ConflictException);
            expect(vehicleRepository.create).not.toHaveBeenCalled(); // La création ne doit pas avoir lieu
        });
    });
});
