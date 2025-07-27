import { Router } from "express";
import offerController from "../controllers/offerController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/authorizationMiddleware.js";

/**
 * @file Définit les routes pour les offres commerciales.
 */
const router = Router();

// Un utilisateur authentifié (admin) peut voir les offres disponibles.
router.get(
  "/offers",
  protect,
  authorize("admin"),
  offerController.getAllOffers
);

export default router;
