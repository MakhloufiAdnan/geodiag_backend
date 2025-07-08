import vehicleRepository from '../repositories/vehicleRepository.js';
import { VehicleDto } from '../dtos/vehicleDto.js';

/**
 * @file Gère la logique métier pour les véhicules.
 */
class VehicleService {
    /**
     * Récupère un véhicule par son immatriculation.
     * @param {string} registration - La plaque d'immatriculation.
     * @returns {Promise<VehicleDto|null>} Le véhicule ou null.
     */
    async getVehicleByRegistration(registration) {
        const vehicle = await vehicleRepository.findByRegistration(registration);
        return vehicle ? new VehicleDto(vehicle) : null;
    }

    /**
     * Crée un nouveau véhicule.
     * Note : La logique d'autorisation (qui a le droit de créer un véhicule ?)
     * devrait être ajoutée ici.
     * @param {object} vehicleData - Les données du véhicule.
     * @param {object} authenticatedUser - L'utilisateur qui effectue la requête.
     * @returns {Promise<VehicleDto>} Le nouveau véhicule créé.
     */
    async createVehicle(vehicleData) {

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
