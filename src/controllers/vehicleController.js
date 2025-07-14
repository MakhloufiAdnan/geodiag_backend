import vehicleService from '../services/vehicleService.js';

/**
 * @file Gère les requêtes HTTP pour l'entité "Vehicle".
 */
class VehicleController {
    /**
     * Récupère un véhicule spécifique par sa plaque d'immatriculation.
     * @param {object} req - L'objet de la requête Express.
     * @param {object} res - L'objet de la réponse Express.
     * @param {function} next - La fonction middleware suivante.
     */
    async getVehicleByRegistration(req, res, next) {
        try {
            const vehicle = await vehicleService.getVehicleByRegistration(req.params.registration, req.user);
            if (!vehicle) {
                return res.status(404).json({ message: "Vehicle not found" });
            }
            res.status(200).json(vehicle);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Crée un nouveau véhicule.
     * @param {object} req - L'objet de la requête Express.
     * @param {object} res - L'objet de la réponse Express.
     * @param {function} next - La fonction middleware suivante.
     */
    async createVehicle(req, res, next) {
        try {
            const newVehicle = await vehicleService.createVehicle(req.body, req.user);
            res.status(201).json(newVehicle);
        } catch (error) {
            next(error);
        }
    }
}

export default new VehicleController();