import { db } from '../db/index.js';

/**
 * @file Gère l'accès et la manipulation des données pour l'entité Vehicle.
 */
class VehicleRepository {
    /**
     * Trouve un véhicule par son ID.
     * @param {string} id - L'ID du véhicule.
     * @returns {Promise<object|undefined>} L'objet véhicule s'il est trouvé.
     */
    async findById(id) {
        const { rows } = await db.query('SELECT * FROM vehicles WHERE vehicle_id = $1', [id]);
        return rows[0];
    }

    /**
     * Trouve un véhicule par sa plaque d'immatriculation.
     * @param {string} registration - La plaque d'immatriculation.
     * @returns {Promise<object|undefined>} L'objet véhicule s'il est trouvé.
     */
    async findByRegistration(registration) {
        const { rows } = await db.query('SELECT * FROM vehicles WHERE registration = $1', [registration]);
        return rows[0];
    }
    
    /**
     * Trouve un véhicule par son VIN.
     * @param {string} vin - Le numéro d'identification du véhicule.
     * @returns {Promise<object|undefined>} L'objet véhicule s'il est trouvé.
     */
    async findByVin(vin) {
        const { rows } = await db.query('SELECT * FROM vehicles WHERE vin = $1', [vin]);
        return rows[0];
    }

    /**
     * Crée un nouveau véhicule.
     * @param {object} vehicleData - Les données du véhicule.
     * @returns {Promise<object>} L'objet du véhicule créé.
     */
    async create(vehicleData) {
        const { model_id, registration, vin, first_registration_date, energy, mileage, current_wheel_size, options } = vehicleData;
        const { rows } = await db.query(
            `INSERT INTO vehicles (model_id, registration, vin, first_registration_date, energy, mileage, current_wheel_size, options)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [model_id, registration, vin, first_registration_date, energy, mileage, current_wheel_size, options]
        );
        return rows[0];
    }
}

export default new VehicleRepository();