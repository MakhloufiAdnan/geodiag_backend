import { Router } from 'express';
import vehicleController from '../controllers/vehicleController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validateVehicleCreation, validateVehicleRegistration } from '../validators/vehicleValidator.js';

/**
 * @file Définit les routes pour la gestion des véhicules.
 */
const router = Router();

// Toutes les routes sont protégées et valident leurs entrées.
router.post('/vehicles', protect, validateVehicleCreation, vehicleController.createVehicle);
router.get('/vehicles/by-registration/:registration', protect, validateVehicleRegistration, vehicleController.getVehicleByRegistration);

export default router;