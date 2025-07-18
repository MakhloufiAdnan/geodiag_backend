import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { ForbiddenException, ConflictException } from '../../src/exceptions/apiException.js';

/**
 * @file Tests unitaires pour VehicleService.
 * @description Valide la logique métier pour la gestion des véhicules, y compris les règles
 * d'autorisation et la gestion des conflits (immatriculation, VIN).
 */

// Mocker le repository pour isoler le service
jest.unstable_mockModule('../../src/repositories/vehicleRepository.js', () => ({
    default: {
        findByRegistration: jest.fn(),
        findByVin: jest.fn(),
        create: jest.fn(),
    },
}));

const { default: vehicleRepository } = await import('../../src/repositories/vehicleRepository.js');
const { default: vehicleService } = await import('../../src/services/vehicleService.js');

describe('VehicleService', () => {
    const mockAdminUser = { role: 'admin' };
    const mockTechnicianUser = { role: 'technician' };
    const mockOtherUser = { role: 'other' }; // Un rôle non autorisé
    const vehicleData = { registration: 'AA-123-BB', vin: '1234567890ABCDEFG' };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    /**
     * @describe Suite de tests pour la méthode createVehicle.
     */
    describe('createVehicle', () => {
        /**
         * @it Doit autoriser un administrateur à créer un véhicule.
         */
        it('doit autoriser un admin à créer un véhicule', async () => {
        // Arrange
        vehicleRepository.findByRegistration.mockResolvedValue(null);
        vehicleRepository.findByVin.mockResolvedValue(null);
        // CORRECTION : S'assurer que le mock retourne un objet pour le DTO
        vehicleRepository.create.mockResolvedValue({ vehicle_id: 'new-uuid', ...vehicleData });
        
        // Act
        await vehicleService.createVehicle(vehicleData, mockAdminUser);
        
        // Assert
        expect(vehicleRepository.create).toHaveBeenCalledWith(vehicleData);
        });

        /**
         * @it Doit autoriser un technicien à créer un véhicule.
         */
        it('doit autoriser un technicien à créer un véhicule', async () => {
        // Arrange
        vehicleRepository.findByRegistration.mockResolvedValue(null);
        vehicleRepository.findByVin.mockResolvedValue(null);
        // CORRECTION : S'assurer que le mock retourne un objet pour le DTO
        vehicleRepository.create.mockResolvedValue({ vehicle_id: 'new-uuid', ...vehicleData });
        
        // Act
        await vehicleService.createVehicle(vehicleData, mockTechnicianUser);
        
        // Assert
        expect(vehicleRepository.create).toHaveBeenCalledWith(vehicleData);
        });

        /**
         * @it Doit lever une ForbiddenException pour un utilisateur avec un rôle non autorisé.
         */
        it('doit lever une ForbiddenException pour un utilisateur non autorisé', async () => {
        // Arrange
        const action = () => vehicleService.createVehicle(vehicleData, mockOtherUser);
        
        // Act & Assert
        await expect(action).rejects.toThrow(ForbiddenException);
        });

        /**
         * @it Doit lever une ConflictException si l'immatriculation existe déjà.
         */
        it('doit lever une ConflictException si l\'immatriculation existe déjà', async () => {
        // Arrange
        vehicleRepository.findByRegistration.mockResolvedValue({ registration: 'AA-123-BB' });
        const action = () => vehicleService.createVehicle(vehicleData, mockAdminUser);
        
        // Act & Assert
        await expect(action).rejects.toThrow(ConflictException);
        });

        /**
         * @it Doit lever une ConflictException si le VIN existe déjà.
         */
        it('doit lever une ConflictException si le VIN existe déjà', async () => {
        // Arrange
        vehicleRepository.findByRegistration.mockResolvedValue(null);
        vehicleRepository.findByVin.mockResolvedValue({ vin: '1234567890ABCDEFG' });
        const action = () => vehicleService.createVehicle(vehicleData, mockAdminUser);
        
        // Act & Assert
        await expect(action).rejects.toThrow(ConflictException);
        });
    });
});
