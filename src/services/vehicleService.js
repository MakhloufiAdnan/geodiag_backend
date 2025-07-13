import vehicleRepository from '../repositories/vehicleRepository.js';
import { VehicleDto } from '../dtos/vehicleDto.js';
import { NotFoundException, ConflictException, ForbiddenException } from '../exceptions/apiException.js';

/**
 * @file Gère la logique métier pour les véhicules.
 * @class VehicleService
 */
class VehicleService {
    /**
     * Récupère un véhicule par son immatriculation.
     * @param {string} registration - La plaque d'immatriculation.
     * @returns {Promise<VehicleDto>} Le véhicule formaté via DTO.
     * @throws {NotFoundException} Si aucun véhicule n'est trouvé.
     */
    async getVehicleByRegistration(registration) {
        const vehicle = await vehicleRepository.findByRegistration(registration);
        if (!vehicle) {
            throw new NotFoundException('Véhicule non trouvé.');
        }
        return new VehicleDto(vehicle);
    }

    /**
     * Crée un nouveau véhicule.
     * @param {object} vehicleData - Les données du véhicule.
     * @param {object} authenticatedUser - L'utilisateur qui effectue la requête.
     * @returns {Promise<VehicleDto>} Le nouveau véhicule créé et formaté.
     * @throws {ForbiddenException} Si l'utilisateur n'est pas autorisé.
     * @throws {ConflictException} Si la plaque ou le VIN existe déjà.
     */
    async createVehicle(vehicleData, authenticatedUser) {
        // Seuls les admins ou les techniciens peuvent créer un véhicule.
        if (!authenticatedUser || !['admin', 'technician'].includes(authenticatedUser.role)) {
            throw new ForbiddenException('Accès refusé. Seul un utilisateur connecté peut créer un véhicule.');
        }

        const existingByReg = await vehicleRepository.findByRegistration(vehicleData.registration);
        if (existingByReg) {
            throw new ConflictException("Un véhicule avec cette plaque d'immatriculation existe déjà.");
        }
        const existingByVin = await vehicleRepository.findByVin(vehicleData.vin);
        if (existingByVin) {
            throw new ConflictException('Un véhicule avec ce VIN existe déjà.');
        }

        const newVehicle = await vehicleRepository.create(vehicleData);
        return new VehicleDto(newVehicle);
    }
}

export default new VehicleService();
