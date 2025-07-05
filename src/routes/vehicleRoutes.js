import { Router } from 'express';
import vehicleController from '../controllers/vehicleController.js';
import { protect } from '../middleware/authMiddleware.js';

// Importer les middlewares de validation pré-configurés.
import {
    validateVehicleCreation,
    validateVehicleRegistration
} from '../validators/vehicleValidator.js';

const router = Router();

// Route pour créer un véhicule avec validation du corps de la requête.
router.post('/vehicles', protect, validateVehicleCreation, vehicleController.createVehicle);

// Route pour récupérer un véhicule avec validation du paramètre d'URL.
router.get('/vehicles/by-registration/:registration', protect, validateVehicleRegistration, vehicleController.getVehicleByRegistration);

export default router;