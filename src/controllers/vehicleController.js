import vehicleService from '../services/vehicleService.js';

/**
 * Gère les requêtes HTTP pour l'entité "Vehicle".
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
            const vehicle = await vehicleService.getVehicleByRegistration(req.params.registration);
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
     * Note : La validation des données d'entrée (req.body) est gérée
     * en amont par le middleware de validation Joi dans `vehicleRoutes.js`.
     * @param {object} req - L'objet de la requête Express.
     * @param {object} res - L'objet de la réponse Express.
     * @param {function} next - La fonction middleware suivante.
     */
    async createVehicle(req, res, next) {
        try {
            const newVehicle = await vehicleService.createVehicle(req.body);
            res.status(201).json(newVehicle);
        } catch (error) {
            next(error);
        }
    }
}

// Exporte une instance unique du contrôleur.
export default new VehicleController();