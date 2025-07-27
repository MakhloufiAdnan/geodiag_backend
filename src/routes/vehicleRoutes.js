import { Router } from "express";
import vehicleController from "../controllers/vehicleController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/authorizationMiddleware.js";
import { parsePagination } from "../middleware/paginationMiddleware.js";
import {
  validateVehicleCreation,
  validateVehicleRegistration,
} from "../validators/vehicleValidator.js";

/**
 * @file Définit les routes pour la gestion des véhicules.
 */
const router = Router();

router.get(
  "/vehicles",
  protect,
  authorize("admin", "technician"),
  parsePagination(20),
  vehicleController.getAllVehicles
);

router.post(
  "/vehicles",
  protect,
  authorize("admin", "technician"),
  validateVehicleCreation,
  vehicleController.createVehicle
);

router.get(
  "/vehicles/by-registration/:registration",
  protect,
  authorize("admin", "technician"),
  validateVehicleRegistration,
  vehicleController.getVehicleByRegistration
);

export default router;
