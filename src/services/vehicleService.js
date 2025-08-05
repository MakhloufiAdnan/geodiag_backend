import vehicleRepository from '../repositories/vehicleRepository.js';
import { VehicleDto } from '../dtos/vehicleDto.js';
import {
  NotFoundException,
  ConflictException,
} from '../exceptions/ApiException.js';
import { createPaginatedResponse } from '../utils/paginationUtils.js';

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
   * Récupère une liste paginée de tous les véhicules.
   * @param {number} page - Le numéro de la page actuelle.
   * @param {number} limit - Le nombre d'éléments par page.
   * @returns {Promise<object>} Un objet contenant les données et les métadonnées de pagination.
   */
  async getAllVehicles(page, limit) {
    const offset = (page - 1) * limit;

    // 1. Exécuter les deux requêtes en parallèle pour plus d'efficacité.
    const [vehicles, totalItems] = await Promise.all([
      vehicleRepository.findAll(limit, offset),
      vehicleRepository.countAll(),
    ]);

    // 2. Mapper les résultats en DTOs.
    const vehicleDtos = vehicles.map((vehicle) => new VehicleDto(vehicle));

    // 3. Construire la réponse finale avec l'utilitaire.
    return createPaginatedResponse({
      data: vehicleDtos,
      totalItems,
      page,
      limit,
      baseUrl: '/api/vehicles',
    });
  }

  /**
   * Crée un nouveau véhicule. L'autorisation est gérée en amont par le middleware.
   * @param {object} vehicleData - Les données du véhicule.
   * @returns {Promise<VehicleDto>} Le nouveau véhicule créé et formaté.
   * @throws {ConflictException} Si la plaque ou le VIN existe déjà.
   */
  async createVehicle(vehicleData) {
    const [existingByReg, existingByVin] = await Promise.all([
      vehicleRepository.findByRegistration(vehicleData.registration),
      vehicleRepository.findByVin(vehicleData.vin),
    ]);

    if (existingByReg) {
      throw new ConflictException(
        "Un véhicule avec cette plaque d'immatriculation existe déjà."
      );
    }
    if (existingByVin) {
      throw new ConflictException('Un véhicule avec ce VIN existe déjà.');
    }

    const newVehicle = await vehicleRepository.create(vehicleData);
    return new VehicleDto(newVehicle);
  }
}

export default new VehicleService();
