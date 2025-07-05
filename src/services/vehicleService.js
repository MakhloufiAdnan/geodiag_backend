import vehicleRepository from '../repositories/vehicleRepository.js';
import { VehicleDto } from '../dtos/vehicleDto.js';

class VehicleService {
    async getVehicleByRegistration(registration) {
        const vehicle = await vehicleRepository.findByRegistration(registration);
        return vehicle ? new VehicleDto(vehicle) : null;
    }

    async createVehicle(vehicleData) {
        // Validation pour l'unicité de la plaque et du VIN
        const existingByReg = await vehicleRepository.findByRegistration(vehicleData.registration);
        if (existingByReg) {
            const error = new Error('Un véhicule avec cette plaque d\'immatriculation existe déjà.');
            error.statusCode = 409;
            throw error;
        }
        const existingByVin = await vehicleRepository.findByVin(vehicleData.vin);
        if (existingByVin) {
            const error = new Error('Un véhicule avec ce VIN existe déjà.');
            error.statusCode = 409;
            throw error;
        }

        const newVehicle = await vehicleRepository.create(vehicleData);
        return new VehicleDto(newVehicle);
    }
}

export default new VehicleService();